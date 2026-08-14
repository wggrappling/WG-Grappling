import { ChargeStatus, ChargeType, StudentPlanStatus, StudentStatus } from '../../generated/prisma/enums';
import { ChargeGeneratorService } from './charge-generator.service';

describe('ChargeGeneratorService', () => {
  const prisma = {
    student: { findUnique: jest.fn() },
    studentPlan: { findMany: jest.fn() },
    plan: { findUnique: jest.fn() },
    charge: { findMany: jest.fn(), createMany: jest.fn() },
  };
  const service = new ChargeGeneratorService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.student.findUnique.mockResolvedValue({ id: 1, status: StudentStatus.ACTIVE });
    prisma.plan.findUnique.mockResolvedValue({ id: 2, active: true });
    prisma.charge.findMany.mockResolvedValue([]);
    prisma.charge.createMany.mockResolvedValue({ count: 2 });
    prisma.studentPlan.findMany.mockResolvedValue([]);
  });

  it('gera taxa e mensalidade corretas na criação da matrícula', async () => {
    await service.generateEnrollmentCharges(1, 2, '2026-09-01T00:00:00.000Z', 10, 199.9);
    expect(prisma.charge.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ planId: 2, type: ChargeType.ENROLLMENT_FEE, finalAmount: 199.9, referenceMonth: '2026-09' }),
        expect.objectContaining({ planId: 2, type: ChargeType.MONTHLY_FEE, finalAmount: 199.9, referenceMonth: '2026-09' }),
      ]),
      skipDuplicates: true,
    });
  });

  it('não duplica cobranças existentes da matrícula', async () => {
    prisma.charge.findMany.mockResolvedValue([{ type: ChargeType.ENROLLMENT_FEE }, { type: ChargeType.MONTHLY_FEE }]);
    expect(await service.generateEnrollmentCharges(1, 2, '2026-09-01T00:00:00.000Z', 10, 199.9)).toEqual([]);
    expect(prisma.charge.createMany).not.toHaveBeenCalled();
  });

  it('gera mensalidade para plano ACTIVE elegível com valor, billingDay e competência corretos', async () => {
    prisma.studentPlan.findMany.mockResolvedValue([{ studentId: 1, planId: 2, monthlyPrice: 175, billingDay: 12 }]);
    prisma.charge.createMany.mockResolvedValue({ count: 1 });
    const result = await service.generateMonthlyCharges(undefined, new Date('2026-09-01T00:00:00.000Z'));
    expect(prisma.studentPlan.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: StudentPlanStatus.ACTIVE, student: { status: StudentStatus.ACTIVE }, plan: { active: true } }) }));
    expect(prisma.charge.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ studentId: 1, planId: 2, finalAmount: 175, dueDate: new Date('2026-09-12T12:00:00.000Z'), status: ChargeStatus.PENDING, referenceMonth: '2026-09' })], skipDuplicates: true });
    expect(result).toEqual({ processed: 1, generated: 1, skipped: 0, errors: 0, referenceMonth: '2026-09' });
  });

  it('não seleciona plano FINISHED e contabiliza duplicidade como skipped', async () => {
    prisma.studentPlan.findMany.mockResolvedValue([{ studentId: 1, planId: 2, monthlyPrice: 175, billingDay: 12 }]);
    prisma.charge.createMany.mockResolvedValue({ count: 0 });
    const result = await service.generateMonthlyCharges(undefined, new Date('2026-09-01T00:00:00.000Z'));
    expect(prisma.studentPlan.findMany.mock.calls[0][0].where.status).toBe(StudentPlanStatus.ACTIVE);
    expect(result.skipped).toBe(1);
  });

  it('execuções repetidas permanecem idempotentes', async () => {
    prisma.studentPlan.findMany.mockResolvedValue([{ studentId: 1, planId: 2, monthlyPrice: 175, billingDay: 12 }]);
    prisma.charge.createMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    const date = new Date('2026-09-01T00:00:00.000Z');
    expect((await service.generateMonthlyCharges(undefined, date)).generated).toBe(1);
    expect((await service.generateMonthlyCharges(undefined, date)).generated).toBe(0);
  });
});
