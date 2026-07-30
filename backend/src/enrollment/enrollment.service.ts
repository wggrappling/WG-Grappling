import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { StudentModalityStatus } from '../../generated/prisma/enums';
import { StudentPlanStatus } from '../../generated/prisma/enums';
import { ChargeGeneratorService } from '../charge/charge-generator.service';

@Injectable()
export class EnrollmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chargeGeneratorService: ChargeGeneratorService,
  ) {}

  async create(createEnrollmentDto: CreateEnrollmentDto) {
    const { studentId, planId, monthlyPrice, billingDay, startDate, modalityIds = [], classIds = [] } = createEnrollmentDto;

    if (!studentId || !planId || !monthlyPrice || !billingDay || !startDate) {
      throw new BadRequestException('studentId, planId, monthlyPrice, billingDay e startDate são obrigatórios.');
    }

    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException(`Student com id ${studentId} não encontrado.`);
    }

    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundException(`Plan com id ${planId} não encontrado.`);
    }

    if (modalityIds.length > 0) {
      const modalities = await this.prisma.modality.findMany({ where: { id: { in: modalityIds } } });
      if (modalities.length !== modalityIds.length) {
        throw new NotFoundException('Uma ou mais modalidades informadas não foram encontradas.');
      }
    }

    if (classIds.length > 0) {
      const classes = await this.prisma.class.findMany({ where: { id: { in: classIds } } });
      if (classes.length !== classIds.length) {
        throw new NotFoundException('Uma ou mais turmas informadas não foram encontradas.');
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const createdStudentPlan = await tx.studentPlan.create({
        data: {
          studentId,
          planId,
          startDate: new Date(startDate),
          monthlyPrice,
          billingDay,
          status: StudentPlanStatus.ACTIVE,
        },
      });

      const createdStudentModalities = modalityIds.length > 0
        ? await Promise.all(
            modalityIds.map((modalityId) =>
              tx.studentModality.create({
                data: {
                  studentId,
                  modalityId,
                  startedAt: new Date(startDate),
                  status: StudentModalityStatus.ACTIVE,
                },
              }),
            ),
          )
        : [];

      const createdStudentClasses = classIds.length > 0
        ? await Promise.all(
            classIds.map((classId) =>
              tx.studentClass.create({
                data: {
                  studentId,
                  classId,
                },
              }),
            ),
          )
        : [];

      await this.chargeGeneratorService.generateEnrollmentCharges(
        studentId,
        planId,
        new Date(startDate),
        billingDay,
        monthlyPrice,
        tx,
      );

      return {
        studentPlanId: createdStudentPlan.id,
        studentModalityIds: createdStudentModalities.map((item) => item.id),
        studentClassIds: createdStudentClasses.map((item) => item.id),
        modalityCount: createdStudentModalities.length,
        classCount: createdStudentClasses.length,
      };
    });

    return {
      message: 'Matrícula realizada com sucesso!',
      data: result,
    };
  }
}
