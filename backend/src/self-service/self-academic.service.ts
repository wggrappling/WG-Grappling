import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AttendanceStatus,
  ChargeStatus,
  ChargeType,
  GraduationStatus,
  StudentModalityStatus,
  StudentPlanStatus,
} from '../../generated/prisma/enums';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUserContext } from './context/authenticated-user-context';
import type { SelfAttendanceQueryDto } from './dto/self-attendance-query.dto';

const graduationSelect = {
  id: true,
  belt: true,
  degree: true,
  beltStartedAt: true,
  graduatedAt: true,
  status: true,
  correctedAt: true,
  cancelledAt: true,
  modality: { select: { id: true, name: true } },
  graduationLevel: { select: { code: true, name: true } },
} as const;

const modalitySelect = {
  id: true,
  status: true,
  startedAt: true,
  pausedAt: true,
  resumedAt: true,
  finishedAt: true,
  modality: {
    select: { id: true, name: true, description: true, hasGraduation: true },
  },
} as const;

const money = (value: unknown) => Number(String(value));
const decimal = (value: unknown) => new Prisma.Decimal(String(value));
const dateOnly = (date: Date) => date.toISOString().slice(0, 10);

@Injectable()
export class SelfAcademicService {
  constructor(private readonly prisma: PrismaService) {}

  async getGraduations(context: AuthenticatedUserContext) {
    const history = await this.prisma.graduation.findMany({
      where: { studentId: context.studentId },
      select: graduationSelect,
      orderBy: [{ graduatedAt: 'desc' }, { id: 'desc' }],
    });
    const current = history.filter(
      (row, index) =>
        row.status === GraduationStatus.ACTIVE &&
        history.findIndex(
          (candidate) =>
            candidate.status === GraduationStatus.ACTIVE &&
            candidate.modality.id === row.modality.id,
        ) === index,
    );
    return { current, history };
  }

  async getModalities(context: AuthenticatedUserContext) {
    const rows = await this.prisma.studentModality.findMany({
      where: { studentId: context.studentId },
      select: modalitySelect,
    });
    const current = rows
      .filter((row) => row.status !== StudentModalityStatus.FINISHED)
      .sort((a, b) => {
        const group = (status: StudentModalityStatus) =>
          status === StudentModalityStatus.ACTIVE ? 0 : 1;
        return (
          group(a.status) - group(b.status) ||
          b.startedAt.getTime() - a.startedAt.getTime() ||
          b.id - a.id
        );
      });
    const history = rows
      .filter((row) => row.status === StudentModalityStatus.FINISHED)
      .sort(
        (a, b) =>
          (b.finishedAt?.getTime() ?? 0) - (a.finishedAt?.getTime() ?? 0) ||
          b.startedAt.getTime() - a.startedAt.getTime() ||
          b.id - a.id,
      );
    return { current, history };
  }

  async getAttendance(
    context: AuthenticatedUserContext,
    query: SelfAttendanceQueryDto,
    now = new Date(),
  ) {
    const { start, end } = this.attendancePeriod(query, now);
    const records = await this.prisma.attendance.findMany({
      where: {
        studentId: context.studentId,
        attendanceDate: { gte: start, lte: end },
      },
      select: {
        id: true,
        attendanceDate: true,
        status: true,
        class: {
          select: {
            id: true,
            name: true,
            modality: { select: { name: true } },
          },
        },
      },
      orderBy: [{ attendanceDate: 'desc' }, { id: 'desc' }],
    });
    return {
      period: { startDate: dateOnly(start), endDate: dateOnly(end) },
      summary: {
        total: records.length,
        present: records.filter((row) => row.status === AttendanceStatus.PRESENT).length,
        absent: records.filter((row) => row.status === AttendanceStatus.ABSENT).length,
        justified: records.filter((row) => row.status === AttendanceStatus.JUSTIFIED).length,
      },
      records,
    };
  }

  async getFinance(context: AuthenticatedUserContext, now = new Date()) {
    const [planRows, chargeRows] = await Promise.all([
      this.prisma.studentPlan.findMany({
        where: { studentId: context.studentId },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          monthlyPrice: true,
          billingDay: true,
          status: true,
          plan: {
            select: { id: true, name: true, description: true, weeklyClasses: true },
          },
        },
        orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.charge.findMany({
        where: { studentId: context.studentId, type: { not: ChargeType.PRODUCT } },
        select: {
          id: true,
          type: true,
          description: true,
          originalAmount: true,
          discountAmount: true,
          finalAmount: true,
          dueDate: true,
          referenceMonth: true,
          status: true,
          payments: {
            select: {
              id: true,
              amount: true,
              paidAt: true,
              method: true,
              refundedAt: true,
            },
            orderBy: [{ paidAt: 'desc' }, { id: 'desc' }],
          },
        },
        orderBy: [{ dueDate: 'desc' }, { id: 'desc' }],
      }),
    ]);

    const plans = planRows.map((row) => ({
      ...row,
      monthlyPrice: money(row.monthlyPrice),
    }));
    const charges = chargeRows.map(({ payments, ...charge }) => {
      const totalPaidDecimal = payments
        .filter((payment) => payment.refundedAt === null)
        .reduce(
          (total, payment) => total.plus(decimal(payment.amount)),
          new Prisma.Decimal(0),
        );
      const totalPaid = totalPaidDecimal.toNumber();
      return {
        ...charge,
        originalAmount: money(charge.originalAmount),
        discountAmount: money(charge.discountAmount),
        finalAmount: money(charge.finalAmount),
        totalPaid,
        balance: Prisma.Decimal.max(
          new Prisma.Decimal(0),
          decimal(charge.finalAmount).minus(totalPaidDecimal),
        ).toNumber(),
      };
    });
    const payments = chargeRows
      .flatMap((charge) =>
        charge.payments.map((payment) => ({
          id: payment.id,
          chargeId: charge.id,
          amount: money(payment.amount),
          paidAt: payment.paidAt,
          method: payment.method,
          refundedAt: payment.refundedAt,
          state: payment.refundedAt ? 'REFUNDED' : 'VALID',
        })),
      )
      .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime() || b.id - a.id);
    const openStatuses: ChargeStatus[] = [
      ChargeStatus.PENDING,
      ChargeStatus.PARTIALLY_PAID,
      ChargeStatus.OVERDUE,
    ];
    const open = charges.filter(
      (charge) => openStatuses.includes(charge.status) && charge.balance > 0,
    );
    const overdue = open.filter((charge) => charge.status === ChargeStatus.OVERDUE);
    const nextCharge = [...open]
      .filter((charge) => charge.dueDate >= now)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime() || a.id - b.id)[0] ?? null;

    return {
      plans: {
        current: plans.filter((plan) =>
          plan.status === StudentPlanStatus.ACTIVE ||
          plan.status === StudentPlanStatus.PAUSED,
        ),
        history: plans.filter((plan) =>
          plan.status === StudentPlanStatus.CANCELLED ||
          plan.status === StudentPlanStatus.FINISHED,
        ),
      },
      charges,
      payments,
      situation: {
        openChargeCount: open.length,
        openBalance: open
          .reduce(
            (total, charge) => total.plus(decimal(charge.balance)),
            new Prisma.Decimal(0),
          )
          .toNumber(),
        overdueChargeCount: overdue.length,
        overdueBalance: overdue
          .reduce(
            (total, charge) => total.plus(decimal(charge.balance)),
            new Prisma.Decimal(0),
          )
          .toNumber(),
        nextCharge,
      },
    };
  }

  private attendancePeriod(query: SelfAttendanceQueryDto, now: Date) {
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const defaultStart = new Date(today);
    defaultStart.setUTCDate(defaultStart.getUTCDate() - 89);
    const start = query.startDate ? this.parseDate(query.startDate, 'startDate') : defaultStart;
    const endDay = query.endDate ? this.parseDate(query.endDate, 'endDate') : today;
    if (start > endDay) {
      throw new BadRequestException('startDate deve ser anterior ou igual a endDate.');
    }
    const end = new Date(endDay);
    end.setUTCHours(23, 59, 59, 999);
    return { start, end };
  }

  private parseDate(value: string, field: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException(`${field} deve usar o formato YYYY-MM-DD.`);
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || dateOnly(date) !== value) {
      throw new BadRequestException(`${field} inválida.`);
    }
    return date;
  }
}
