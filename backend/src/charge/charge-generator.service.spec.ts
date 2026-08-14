import { ChargeStatus, ChargeType, StudentPlanStatus, StudentStatus } from '../../generated/prisma/enums';
import { ChargeGeneratorService } from './charge-generator.service';

describe('ChargeGeneratorService', () => {
  const prisma = {
    student: { findUnique: jest.fn(), findMany: jest.fn() },
    plan: { findUnique: jest.fn() },
    charge: { findFirst: jest.fn(), createMany: jest.fn(), create: jest.fn() },
  };
  const service = new ChargeGeneratorService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.student.findUnique.mockResolvedValue({ id: 1, status: StudentStatus.ACTIVE });
    prisma.plan.findUnique.mockResolvedValue({ id: 2, active: true });
    prisma.charge.findFirst.mockResolvedValue(null);
    prisma.charge.createMany.mockResolvedValue({ count: 2 });
  });

  it('gera taxa e mensalidade corretas na criação da matrícula', async () => {
    await service.generateEnrollmentCharges(1, 2, '2026-09-01T00:00:00.000Z', 10, 199.9);
    expect(prisma.charge.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ studentId: 1, planId: 2, type: ChargeType.ENROLLMENT_FEE, finalAmount: 199.9, status: ChargeStatus.PENDING, referenceMonth: '2026-09' }),
        expect.objectContaining({ studentId: 1, planId: 2, type: ChargeType.MONTHLY_FEE, finalAmount: 199.9, status: ChargeStatus.PENDING, referenceMonth: '2026-09' }),
      ]),
      skipDuplicates: true,
    });
  });

  it('não duplica cobranças existentes da mesma competência', async () => {
    prisma.charge.findFirst.mockResolvedValue({ id: 5 });
    const result = await service.generateEnrollmentCharges(1, 2, '2026-09-01T00:00:00.000Z', 10, 199.9);
    expect(result).toEqual([]);
    expect(prisma.charge.createMany).not.toHaveBeenCalled();
  });

  it('gera mensalidade com plano ACTIVE elegível, valor e vencimento atuais', async () => {
    const activePlan = { id: 8, planId: 2, monthlyPrice: 175, billingDay: 12, status: StudentPlanStatus.ACTIVE };
    prisma.student.findMany.mockResolvedValue([{ id: 1, status: StudentStatus.ACTIVE, plans: [activePlan] }]);
    prisma.charge.create.mockResolvedValue({ id: 10 });
    await service.generateMonthlyCharges();
    expect(prisma.student.findMany).toHaveBeenCalledWith(expect.objectContaining({ include: { plans: expect.objectContaining({ where: expect.objectContaining({ status: StudentPlanStatus.ACTIVE, startDate: expect.any(Object) }) }) } }));
    expect(prisma.charge.create).toHaveBeenCalledWith({ data: expect.objectContaining({ studentId: 1, planId: 2, originalAmount: 175, finalAmount: 175, status: ChargeStatus.PENDING }) });
  });
});
