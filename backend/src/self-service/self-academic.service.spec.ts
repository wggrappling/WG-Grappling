import { BadRequestException } from '@nestjs/common';
import {
  AttendanceStatus,
  ChargeStatus,
  ChargeType,
  GraduationStatus,
  PaymentMethod,
  StudentModalityStatus,
  StudentPlanStatus,
  StudentStatus,
  UserRole,
} from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { SelfServiceCapability } from './context/student-access.policy';
import { SelfAcademicService } from './self-academic.service';
import { SelfAttendanceQueryDto } from './dto/self-attendance-query.dto';
import { validate } from 'class-validator';

describe('SelfAcademicService', () => {
  const prisma = {
    graduation: { findMany: jest.fn() },
    studentModality: { findMany: jest.fn() },
    attendance: { findMany: jest.fn() },
    studentPlan: { findMany: jest.fn() },
    charge: { findMany: jest.fn() },
  };
  const service = new SelfAcademicService(prisma as unknown as PrismaService);
  const activeContext = {
    userId: 5,
    role: UserRole.ALUNO,
    studentId: 20,
    studentStatus: StudentStatus.ACTIVE,
    capabilities: [SelfServiceCapability.READ, SelfServiceCapability.OPERATE],
  } as const;
  const pausedContext = {
    ...activeContext,
    studentStatus: StudentStatus.PAUSED,
    capabilities: [SelfServiceCapability.READ],
  } as const;

  beforeEach(() => jest.clearAllMocks());

  it('returns current and complete graduation history using server ownership', async () => {
    const modality = { id: 2, name: 'Jiu-Jitsu' };
    prisma.graduation.findMany.mockResolvedValue([
      { id: 3, status: GraduationStatus.ACTIVE, modality },
      { id: 2, status: GraduationStatus.SUPERSEDED, modality },
      { id: 1, status: GraduationStatus.CANCELLED, modality },
    ]);

    const result = await service.getGraduations(activeContext);

    expect(result.current).toEqual([{ id: 3, status: GraduationStatus.ACTIVE, modality }]);
    expect(result.history).toHaveLength(3);
    expect(prisma.graduation.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId: 20 },
      select: expect.objectContaining({ id: true, modality: expect.any(Object) }),
      orderBy: [{ graduatedAt: 'desc' }, { id: 'desc' }],
    }));
  });

  it('returns empty graduation sections and permits PAUSED consultation', async () => {
    prisma.graduation.findMany.mockResolvedValue([]);
    await expect(service.getGraduations(pausedContext)).resolves.toEqual({ current: [], history: [] });
    expect(prisma.graduation.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId: 20 } }));
  });

  it('separates and orders current and historical modalities owned by the Student', async () => {
    const modality = { id: 1, name: 'Jiu-Jitsu', description: 'Arte', hasGraduation: true };
    prisma.studentModality.findMany.mockResolvedValue([
      { id: 1, status: StudentModalityStatus.PAUSED, startedAt: new Date('2025-01-01'), pausedAt: new Date(), resumedAt: null, finishedAt: null, modality },
      { id: 2, status: StudentModalityStatus.ACTIVE, startedAt: new Date('2024-01-01'), pausedAt: null, resumedAt: null, finishedAt: null, modality },
      { id: 3, status: StudentModalityStatus.FINISHED, startedAt: new Date('2023-01-01'), pausedAt: null, resumedAt: null, finishedAt: new Date('2024-01-01'), modality },
    ]);

    const result = await service.getModalities(pausedContext);

    expect(result.current.map((row) => row.status)).toEqual([StudentModalityStatus.ACTIVE, StudentModalityStatus.PAUSED]);
    expect(result.history.map((row) => row.status)).toEqual([StudentModalityStatus.FINISHED]);
    expect(prisma.studentModality.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId: 20 },
      select: expect.not.objectContaining({ studentId: true }),
    }));
  });

  it('returns empty modality sections', async () => {
    prisma.studentModality.findMany.mockResolvedValue([]);
    await expect(service.getModalities(activeContext)).resolves.toEqual({ current: [], history: [] });
  });

  it('uses the inclusive default 90-day attendance period, ordering and summary', async () => {
    prisma.attendance.findMany.mockResolvedValue([
      { id: 3, status: AttendanceStatus.PRESENT },
      { id: 2, status: AttendanceStatus.ABSENT },
      { id: 1, status: AttendanceStatus.JUSTIFIED },
    ]);
    const result = await service.getAttendance(activeContext, {}, new Date('2026-08-27T12:00:00.000Z'));

    expect(result.period).toEqual({ startDate: '2026-05-30', endDate: '2026-08-27' });
    expect(result.summary).toEqual({ total: 3, present: 1, absent: 1, justified: 1 });
    expect(prisma.attendance.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId: 20, attendanceDate: { gte: new Date('2026-05-30T00:00:00.000Z'), lte: new Date('2026-08-27T23:59:59.999Z') } },
      orderBy: [{ attendanceDate: 'desc' }, { id: 'desc' }],
    }));
  });

  it('accepts either attendance date filter and preserves server ownership', async () => {
    prisma.attendance.findMany.mockResolvedValue([]);
    await service.getAttendance(pausedContext, { startDate: '2026-08-01' }, new Date('2026-08-27T12:00:00.000Z'));
    expect(prisma.attendance.findMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: expect.objectContaining({ studentId: 20, attendanceDate: expect.objectContaining({ gte: new Date('2026-08-01T00:00:00.000Z') }) }),
    }));
    await service.getAttendance(activeContext, { endDate: '2026-08-10' }, new Date('2026-08-27T12:00:00.000Z'));
    expect(prisma.attendance.findMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: expect.objectContaining({ studentId: 20, attendanceDate: expect.objectContaining({ lte: new Date('2026-08-10T23:59:59.999Z') }) }),
    }));
  });

  it.each([
    [{ startDate: 'invalid' }],
    [{ startDate: '2026-02-30' }],
    [{ startDate: '2026-08-20', endDate: '2026-08-01' }],
  ])('rejects invalid attendance dates without querying', async (query) => {
    await expect(service.getAttendance(activeContext, query)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.attendance.findMany).not.toHaveBeenCalled();
  });

  it('rejects studentId and unknown attendance query fields', async () => {
    const query = Object.assign(new SelfAttendanceQueryDto(), {
      studentId: 99,
      classId: 8,
    });
    const errors = await validate(query, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.map((error) => error.property).sort()).toEqual(['classId', 'studentId']);
  });

  it('returns academic finance with plans, charges, payments and exact situation', async () => {
    prisma.studentPlan.findMany.mockResolvedValue([
      { id: 1, status: StudentPlanStatus.ACTIVE, monthlyPrice: '150.00', startDate: new Date(), endDate: null, billingDay: 10, plan: { id: 2, name: 'Mensal', description: 'Plano', weeklyClasses: 3 } },
      { id: 2, status: StudentPlanStatus.FINISHED, monthlyPrice: '100.00', startDate: new Date(), endDate: new Date(), billingDay: 5, plan: { id: 3, name: 'Antigo', description: 'Plano', weeklyClasses: 2 } },
    ]);
    prisma.charge.findMany.mockResolvedValue([
      { id: 8, type: ChargeType.MONTHLY_FEE, description: 'Mensalidade', originalAmount: '150', discountAmount: '0', finalAmount: '150', dueDate: new Date('2026-09-10'), referenceMonth: '2026-09', status: ChargeStatus.PENDING, payments: [] },
      { id: 7, type: ChargeType.MONTHLY_FEE, description: 'Mensalidade', originalAmount: '150', discountAmount: '0', finalAmount: '150', dueDate: new Date('2026-08-10'), referenceMonth: '2026-08', status: ChargeStatus.OVERDUE, payments: [{ id: 4, amount: '50', paidAt: new Date('2026-08-01'), method: PaymentMethod.PIX, refundedAt: null }] },
    ]);

    const result = await service.getFinance(pausedContext, new Date('2026-08-27'));

    expect(result.plans.current).toHaveLength(1);
    expect(result.plans.history).toHaveLength(1);
    expect(result.charges[1]).toEqual(expect.objectContaining({ totalPaid: 50, balance: 100 }));
    expect(result.payments).toEqual([expect.objectContaining({ chargeId: 7, state: 'VALID' })]);
    expect(result.situation).toEqual(expect.objectContaining({
      openChargeCount: 2,
      openBalance: 250,
      overdueChargeCount: 1,
      overdueBalance: 100,
      nextCharge: expect.objectContaining({ id: 8 }),
    }));
    expect(prisma.charge.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId: 20, type: { not: ChargeType.PRODUCT } },
      select: expect.not.objectContaining({ studentId: true }),
    }));
  });

  it('returns an empty financial projection without inventing debt', async () => {
    prisma.studentPlan.findMany.mockResolvedValue([]);
    prisma.charge.findMany.mockResolvedValue([]);
    await expect(service.getFinance(activeContext)).resolves.toEqual({
      plans: { current: [], history: [] },
      charges: [],
      payments: [],
      situation: {
        openChargeCount: 0,
        openBalance: 0,
        overdueChargeCount: 0,
        overdueBalance: 0,
        nextCharge: null,
      },
    });
  });
});
