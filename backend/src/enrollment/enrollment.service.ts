import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { StudentModalityStatus, StudentPlanStatus, StudentStatus } from '../../generated/prisma/enums';
import { ChargeGeneratorService } from '../charge/charge-generator.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';

@Injectable()
export class EnrollmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chargeGeneratorService: ChargeGeneratorService,
  ) {}

  async create(dto: CreateEnrollmentDto) {
    const { studentId, person, student: newStudent, planId, monthlyPrice, billingDay, startDate } = dto;
    const modalityIds = [...new Set(dto.modalityIds ?? [])];
    const classIds = [...new Set(dto.classIds ?? [])];
    const hasExistingStudent = studentId !== undefined;
    const hasNewStudentData = person !== undefined || newStudent !== undefined;

    if (hasExistingStudent === hasNewStudentData || (!hasExistingStudent && (!person || !newStudent))) {
      throw new BadRequestException('Informe studentId ou person e student, nunca ambos.');
    }

    if (hasExistingStudent) {
      const existingStudent = await this.prisma.student.findUnique({ where: { id: studentId } });
      if (!existingStudent) throw new NotFoundException(`Student com id ${studentId} não encontrado.`);
    } else {
      const duplicatePerson = await this.prisma.person.findFirst({
        where: { OR: [{ cpf: person!.cpf }, { email: person!.email }] },
        select: { id: true },
      });
      if (duplicatePerson) throw new ConflictException('Já existe uma pessoa cadastrada com este CPF ou e-mail.');

      if (newStudent!.enrollmentNumber) {
        const duplicateEnrollment = await this.prisma.student.findUnique({
          where: { enrollmentNumber: newStudent!.enrollmentNumber },
          select: { id: true },
        });
        if (duplicateEnrollment) throw new ConflictException('Já existe um aluno com este número de matrícula.');
      }
    }

    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException(`Plan com id ${planId} não encontrado.`);

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
      let enrolledStudentId = studentId;

      if (!enrolledStudentId) {
        const createdPerson = await tx.person.create({ data: person! });
        const createdStudent = await tx.student.create({
          data: {
            personId: createdPerson.id,
            enrollmentNumber: newStudent!.enrollmentNumber
              ?? `WG-${new Date(startDate).getUTCFullYear()}-${String(createdPerson.id).padStart(6, '0')}`,
            status: newStudent!.status ?? StudentStatus.ACTIVE,
            joinedAt: new Date(newStudent!.joinedAt ?? startDate),
            notes: newStudent!.notes,
          },
        });
        enrolledStudentId = createdStudent.id;
      }

      const createdStudentPlan = await tx.studentPlan.create({
        data: { studentId: enrolledStudentId, planId, startDate: new Date(startDate), monthlyPrice, billingDay, status: StudentPlanStatus.ACTIVE },
      });
      const createdStudentModalities = await Promise.all(modalityIds.map((modalityId) => tx.studentModality.create({
        data: { studentId: enrolledStudentId!, modalityId, startedAt: new Date(startDate), status: StudentModalityStatus.ACTIVE },
      })));
      const createdStudentClasses = await Promise.all(classIds.map((classId) => tx.studentClass.create({
        data: { studentId: enrolledStudentId!, classId },
      })));

      await this.chargeGeneratorService.generateEnrollmentCharges(
        enrolledStudentId, planId, new Date(startDate), billingDay, monthlyPrice, tx,
      );

      return {
        studentId: enrolledStudentId,
        studentPlanId: createdStudentPlan.id,
        studentModalityIds: createdStudentModalities.map(({ id }) => id),
        studentClassIds: createdStudentClasses.map(({ id }) => id),
        modalityCount: createdStudentModalities.length,
        classCount: createdStudentClasses.length,
      };
    });

    return { message: 'Matrícula realizada com sucesso!', data: result };
  }
}
