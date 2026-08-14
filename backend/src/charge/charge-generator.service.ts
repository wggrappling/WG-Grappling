import { Injectable } from '@nestjs/common';
import { ChargeStatus, ChargeType, StudentStatus, StudentPlanStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

type ChargeCreateInput = {
  studentId: number; planId: number; type: ChargeType; description: string;
  originalAmount: number; discountAmount: number; finalAmount: number;
  dueDate: Date; status: ChargeStatus; referenceMonth: string;
};

export type MonthlyGenerationSummary = {
  processed: number;
  generated: number;
  skipped: number;
  errors: number;
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
    if (!student || student.status !== StudentStatus.ACTIVE) return [];
    const plan = await prismaClient.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.active) return [];

    const charges: ChargeCreateInput[] = [
      { studentId, planId, type: ChargeType.ENROLLMENT_FEE, description: 'Taxa de matrícula', originalAmount: monthlyAmount, discountAmount: 0, finalAmount: monthlyAmount, dueDate: normalizedStartDate, status: ChargeStatus.PENDING, referenceMonth },
      { studentId, planId, type: ChargeType.MONTHLY_FEE, description: 'Mensalidade automática', originalAmount: monthlyAmount, discountAmount: 0, finalAmount: monthlyAmount, dueDate: this.buildDueDateForMonth(normalizedStartDate, billingDay), status: ChargeStatus.PENDING, referenceMonth },
    ];
    const existing = await prismaClient.charge.findMany({
      where: { studentId, referenceMonth, type: { in: [ChargeType.ENROLLMENT_FEE, ChargeType.MONTHLY_FEE] } },
      select: { type: true },
    });
    const existingTypes = new Set(existing.map(({ type }) => type));
    const missing = charges.filter(({ type }) => !existingTypes.has(type));
    if (!missing.length) return [];
    return prismaClient.charge.createMany({ data: missing, skipDuplicates: true });
  }

  async generateMonthlyCharges(tx?: any, referenceDate = new Date()): Promise<MonthlyGenerationSummary> {
    const prismaClient = tx ?? this.prisma;
    const referenceMonth = this.formatReferenceMonth(referenceDate);
    const activePlans = await prismaClient.studentPlan.findMany({
      where: {
        status: StudentPlanStatus.ACTIVE,
        startDate: { lte: referenceDate },
        student: { status: StudentStatus.ACTIVE },
        plan: { active: true },
      },
      select: { studentId: true, planId: true, monthlyPrice: true, billingDay: true },
    });
    const data: ChargeCreateInput[] = activePlans.map((studentPlan) => {
      const amount = Number(studentPlan.monthlyPrice);
      return {
        studentId: studentPlan.studentId,
        planId: studentPlan.planId,
        type: ChargeType.MONTHLY_FEE,
        description: 'Mensalidade automática',
        originalAmount: amount,
        discountAmount: 0,
        finalAmount: amount,
        dueDate: this.buildDueDateForMonth(referenceDate, studentPlan.billingDay),
        status: ChargeStatus.PENDING,
        referenceMonth,
      };
    });
    const created = data.length ? await prismaClient.charge.createMany({ data, skipDuplicates: true }) : { count: 0 };
    return { processed: activePlans.length, generated: created.count, skipped: activePlans.length - created.count, errors: 0, referenceMonth };
  }

  private formatReferenceMonth(date: Date) {
    const year = date.getUTCFullYear();
    const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
    return `${year}-${month}`;
  }

  private buildDueDateForMonth(referenceDate: Date, billingDay: number) {
    const safeDay = Math.min(Math.max(billingDay, 1), 28);
    return new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), safeDay, 12, 0, 0));
  }
}
