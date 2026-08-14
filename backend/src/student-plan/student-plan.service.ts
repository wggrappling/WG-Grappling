import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChargeStatus, StudentPlanStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentPlanDto } from './dto/create-student-plan.dto';
import { UpdateStudentPlanDto } from './dto/update-student-plan.dto';

@Injectable()
export class StudentPlanService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.studentPlan.findMany({ include: { student: true, plan: true } });
  }

  async findOne(id: number) {
    return this.prisma.studentPlan.findUnique({ where: { id }, include: { student: true, plan: true } });
  }

  async create(createStudentPlanDto: CreateStudentPlanDto) {
    void createStudentPlanDto;
    throw new BadRequestException('Crie vínculos de plano por POST /enrollments para manter o ciclo financeiro consistente.');
  }

  async update(id: number, updateStudentPlanDto: UpdateStudentPlanDto) {
    const financialFields = ['studentId', 'planId', 'startDate', 'endDate', 'monthlyPrice', 'billingDay', 'status'] as const;
    if (financialFields.some((field) => updateStudentPlanDto[field] !== undefined)) {
      throw new BadRequestException('Altere plano, valor e vencimento por PATCH /enrollments/:studentId.');
    }
    return this.prisma.studentPlan.update({ where: { id }, data: updateStudentPlanDto, include: { student: true, plan: true } });
  }

  async remove(id: number, actorId?: number) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.studentPlan.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Vínculo de plano não encontrado.');
      const endedAt = new Date();
      const ended = await tx.studentPlan.update({ where: { id }, data: { status: StudentPlanStatus.FINISHED, endDate: endedAt } });
      const cancelled = await tx.charge.updateMany({
        where: { studentId: current.studentId, planId: current.planId, status: ChargeStatus.PENDING, dueDate: { gte: endedAt } },
        data: { status: ChargeStatus.CANCELLED },
      });
      if (actorId !== undefined) {
        await tx.auditLog.create({
          data: { userId: actorId, action: 'STUDENT_PLAN_ENDED', entity: 'StudentPlan', entityId: String(id), metadata: { studentId: current.studentId, planId: current.planId, cancelledPendingCharges: cancelled.count } },
        });
      }
      return { message: 'Plano do aluno encerrado com sucesso.', data: ended };
    }, { isolationLevel: 'Serializable' });
  }
}
