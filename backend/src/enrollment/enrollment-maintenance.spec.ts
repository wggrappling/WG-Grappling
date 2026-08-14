import { ConflictException } from '@nestjs/common';
import { ChargeStatus, UserRole } from '../../generated/prisma/enums';
import { ROLES_KEY } from '../auth/roles.decorator';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';

describe('Enrollment transactional maintenance', () => {
  const tx = {
    student: { findUnique: jest.fn(), update: jest.fn() },
    person: { findFirst: jest.fn(), update: jest.fn() },
    plan: { findFirst: jest.fn() },
    studentPlan: { findMany: jest.fn(), update: jest.fn(), create: jest.fn() },
    charge: { updateMany: jest.fn() },
    auditLog: { create: jest.fn() },
    modality: { findMany: jest.fn() },
    studentModality: { findMany: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
    class: { findMany: jest.fn() },
    studentClass: { findMany: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
  };
  const prisma = { $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) };
  const service = new EnrollmentService(prisma as never, {} as never);
  const planChange = { planId: 4, monthlyPrice: 199.9, billingDay: 10, startDate: '2026-09-01T00:00:00.000Z' };

  beforeEach(() => {
    jest.clearAllMocks();
    tx.student.findUnique.mockResolvedValue({ id: 1, personId: 2, person: { id: 2 } });
    tx.person.findFirst.mockResolvedValue(null);
    tx.plan.findFirst.mockResolvedValue({ id: 4 });
    tx.studentPlan.findMany.mockResolvedValue([{ id: 3, planId: 3, monthlyPrice: 150, billingDay: 5 }]);
    tx.studentPlan.create.mockResolvedValue({ id: 8 });
    tx.charge.updateMany.mockResolvedValue({ count: 1 });
    tx.modality.findMany.mockResolvedValue([]);
    tx.studentModality.findMany.mockResolvedValue([]);
    tx.studentModality.updateMany.mockResolvedValue({ count: 0 });
    tx.class.findMany.mockResolvedValue([]);
    tx.studentClass.findMany.mockResolvedValue([]);
    tx.studentClass.deleteMany.mockResolvedValue({ count: 0 });
  });

  it('atualiza Person e Student dentro da mesma transação', async () => {
    await service.maintain(1, { person: { name: 'Maria', cpf: '12345678901', email: 'maria@example.com' }, student: { status: 'ACTIVE', joinedAt: '2026-01-01T00:00:00.000Z' } } as never);
    expect(tx.person.update).toHaveBeenCalled();
    expect(tx.student.update).toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
  });

  it('encerra o plano anterior, cria outro ACTIVE e cancela somente PENDING futuras', async () => {
    await service.maintain(1, { plan: planChange }, 9);
    expect(tx.studentPlan.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'FINISHED' }) }));
    expect(tx.studentPlan.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ planId: 4, status: 'ACTIVE' }) }));
    expect(tx.charge.updateMany).toHaveBeenCalledWith({
      where: { studentId: 1, planId: 3, status: ChargeStatus.PENDING, dueDate: { gte: new Date(planChange.startDate) } },
      data: { status: ChargeStatus.CANCELLED },
    });
  });

  it('preserva cobranças PAID, PARTIALLY_PAID e OVERDUE ao filtrar cancelamento por PENDING', async () => {
    await service.maintain(1, { plan: planChange });
    const where = tx.charge.updateMany.mock.calls[0][0].where;
    expect(where.status).toBe(ChargeStatus.PENDING);
    expect(where.status).not.toBe(ChargeStatus.PAID);
    expect(where.status).not.toBe(ChargeStatus.OVERDUE);
    expect(where.status).not.toBe(ChargeStatus.PARTIALLY_PAID);
  });

  it('altera valor e vencimento sem editar cobranças emitidas', async () => {
    await service.maintain(1, { plan: { ...planChange, planId: 3 } }, 9);
    expect(tx.studentPlan.update).toHaveBeenCalledWith({ where: { id: 3 }, data: { monthlyPrice: 199.9, billingDay: 10 } });
    expect(tx.charge.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'STUDENT_PLAN_TERMS_UPDATED' }) }));
  });

  it('impede dois planos ativos', async () => {
    tx.studentPlan.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    await expect(service.maintain(1, { plan: planChange })).rejects.toBeInstanceOf(ConflictException);
  });

  it('faz rollback integral se o cancelamento financeiro falhar', async () => {
    tx.charge.updateMany.mockRejectedValue(new Error('financial failure'));
    await expect(service.maintain(1, { plan: planChange })).rejects.toThrow('financial failure');
    expect(tx.studentPlan.update).not.toHaveBeenCalled();
    expect(tx.studentPlan.create).not.toHaveBeenCalled();
  });

  it('registra auditoria da troca e do cancelamento financeiro', async () => {
    await service.maintain(1, { plan: planChange }, 9);
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: 9, action: 'STUDENT_PLAN_CHANGED' }) }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: 9, action: 'FUTURE_PENDING_CHARGES_CANCELLED' }) }));
  });

  it('autoriza reception e bloqueia teacher na operação', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, EnrollmentController.prototype.maintain);
    expect(roles).toEqual(expect.arrayContaining([UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION]));
    expect(roles).not.toContain(UserRole.TEACHER);
  });
});
