import { BadRequestException } from '@nestjs/common';
import { ChargeStatus, StudentPlanStatus } from '../../generated/prisma/enums';
import { StudentPlanService } from './student-plan.service';

describe('StudentPlanService financial lifecycle', () => {
  const tx = {
    studentPlan: { findUnique: jest.fn(), update: jest.fn() },
    charge: { updateMany: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = { $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) };
  const service = new StudentPlanService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    tx.studentPlan.findUnique.mockResolvedValue({ id: 3, studentId: 1, planId: 2, status: StudentPlanStatus.ACTIVE });
    tx.studentPlan.update.mockResolvedValue({ id: 3, status: StudentPlanStatus.FINISHED });
    tx.charge.updateMany.mockResolvedValue({ count: 1 });
  });

  it('encerra sem apagar histórico, preserva cobranças não PENDING e audita', async () => {
    await service.remove(3, 9);
    expect(tx.studentPlan.update).toHaveBeenCalledWith({ where: { id: 3 }, data: { status: StudentPlanStatus.FINISHED, endDate: expect.any(Date) } });
    expect(tx.charge.updateMany).toHaveBeenCalledWith({ where: { studentId: 1, planId: 2, status: ChargeStatus.PENDING, dueDate: { gte: expect.any(Date) } }, data: { status: ChargeStatus.CANCELLED } });
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'STUDENT_PLAN_ENDED', userId: 9 }) }));
  });

  it('faz rollback quando o cancelamento financeiro falha', async () => {
    tx.charge.updateMany.mockRejectedValue(new Error('failure'));
    await expect(service.remove(3, 9)).rejects.toThrow('failure');
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
  });

  it('impede criação direta fora da matrícula transacional', async () => {
    await expect(service.create({} as never)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('impede alteração financeira direta fora da matrícula transacional', async () => {
    await expect(service.update(3, { monthlyPrice: 200 })).rejects.toBeInstanceOf(BadRequestException);
  });
});
