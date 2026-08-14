import { Injectable } from '@nestjs/common';
import { ChargeStatus, ChargeType, StudentStatus, StudentPlanStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

type ChargeCreateInput = {
  studentId: number;
  planId: number;
  type: ChargeType;
  description: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  dueDate: Date;
  status: ChargeStatus;
  referenceMonth: string;
};

@Injectable()
export class ChargeGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  async generateEnrollmentCharges(studentId: number, planId: number, startDate: Date | string, billingDay: number, monthlyPrice: number | string, tx?: any) {
    const prismaClient = tx ?? this.prisma;
    const normalizedStartDate = new Date(startDate);
    const referenceMonth = this.formatReferenceMonth(normalizedStartDate);
    const monthlyAmount = Number(monthlyPrice);

    const student = await prismaClient.student.findUnique({ where: { id: studentId } });
    if (!student || student.status !== StudentStatus.ACTIVE) {
      return [];
    }

    const plan = await prismaClient.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.active) {
      return [];
    }

    const chargesToCreate: ChargeCreateInput[] = [];

    const enrollmentCharge = await this.findExistingCharge(studentId, ChargeType.ENROLLMENT_FEE, referenceMonth, prismaClient);
    if (!enrollmentCharge) {
      chargesToCreate.push({
        studentId,
        planId,
        type: ChargeType.ENROLLMENT_FEE,
        description: 'Taxa de matrícula',
        originalAmount: monthlyAmount,
        discountAmount: 0,
        finalAmount: monthlyAmount,
        dueDate: normalizedStartDate,
        status: ChargeStatus.PENDING,
        referenceMonth,
      });
    }

    const monthlyCharge = await this.findExistingCharge(studentId, ChargeType.MONTHLY_FEE, referenceMonth, prismaClient);
    if (!monthlyCharge) {
      chargesToCreate.push({
        studentId,
        planId,
        type: ChargeType.MONTHLY_FEE,
        description: 'Mensalidade automática',
        originalAmount: monthlyAmount,
        discountAmount: 0,
        finalAmount: monthlyAmount,
        dueDate: this.buildDueDateForMonth(normalizedStartDate, billingDay),
        status: ChargeStatus.PENDING,
        referenceMonth,
      });
    }

    if (chargesToCreate.length === 0) {
      return [];
    }

    return prismaClient.charge.createMany({
      data: chargesToCreate,
      skipDuplicates: true,
    });
  }

  async generateMonthlyCharges(tx?: any) {
    const prismaClient = tx ?? this.prisma;
    const today = new Date();
    const referenceMonth = this.formatReferenceMonth(today);

    const activeStudents = await prismaClient.student.findMany({
      where: { status: StudentStatus.ACTIVE },
      include: {
        plans: {
          where: { status: StudentPlanStatus.ACTIVE, startDate: { lte: today } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const createdCharges: Promise<unknown>[] = [];

    for (const student of activeStudents) {
      const studentPlan = student.plans[0];
      if (!studentPlan) {
        continue;
      }

      const plan = await prismaClient.plan.findUnique({ where: { id: studentPlan.planId } });
      if (!plan || !plan.active) {
        continue;
      }

      const existingCharge = await this.findExistingCharge(student.id, ChargeType.MONTHLY_FEE, referenceMonth, prismaClient);
      if (existingCharge) {
        continue;
      }

      const monthlyAmount = Number(studentPlan.monthlyPrice);
      const dueDate = this.buildDueDateForMonth(today, studentPlan.billingDay);

      createdCharges.push(
        prismaClient.charge.create({
          data: {
            studentId: student.id,
            planId: studentPlan.planId,
            type: ChargeType.MONTHLY_FEE,
            description: 'Mensalidade automática',
            originalAmount: monthlyAmount,
            discountAmount: 0,
            finalAmount: monthlyAmount,
            dueDate,
            status: ChargeStatus.PENDING,
            referenceMonth,
          },
        }),
      );
    }

    if (createdCharges.length === 0) {
      return { message: 'Nenhuma cobrança mensal foi criada.', createdCount: 0 };
    }

    await Promise.all(createdCharges);

    return {
      message: 'Cobranças mensais geradas com sucesso.',
      createdCount: createdCharges.length,
      referenceMonth,
    };
  }

  private async findExistingCharge(studentId: number, type: ChargeType, referenceMonth: string, prismaClient = this.prisma) {
    return prismaClient.charge.findFirst({
      where: {
        studentId,
        type,
        referenceMonth,
      },
    });
  }

  private formatReferenceMonth(date: Date) {
    const year = date.getUTCFullYear();
    const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
    return `${year}-${month}`;
  }

  private buildDueDateForMonth(referenceDate: Date, billingDay: number) {
    const year = referenceDate.getUTCFullYear();
    const month = referenceDate.getUTCMonth();
    const safeDay = Math.min(Math.max(billingDay, 1), 28);
    return new Date(Date.UTC(year, month, safeDay, 12, 0, 0));
  }
}
