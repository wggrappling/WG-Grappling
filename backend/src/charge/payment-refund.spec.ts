import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ChargeStatus } from '../../generated/prisma/enums';
import { ChargeService } from './charge.service';

describe('ChargeService payment refund', () => {
  const future = new Date('2099-01-01T00:00:00.000Z');
  const payment = (amount = 100, overrides: Record<string, unknown> = {}) => ({
    id: 10, chargeId: 1, amount, paidAt: new Date(), refundedAt: null,
    charge: { id: 1, finalAmount: 100, dueDate: future, status: ChargeStatus.PAID }, ...overrides,
  });
  const make = () => {
    const tx = {
      payment: { findUnique: jest.fn(), updateMany: jest.fn(), findMany: jest.fn() },
      charge: { update: jest.fn() }, auditLog: { create: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
      payment: { delete: jest.fn(), deleteMany: jest.fn() },
    };
    return { tx, prisma, service: new ChargeService(prisma as never) };
  };
  const arrange = (tx: ReturnType<typeof make>['tx'], original = payment(), remaining: number[] = []) => {
    tx.payment.findUnique.mockResolvedValue(original);
    tx.payment.updateMany.mockResolvedValue({ count: 1 });
    tx.payment.findMany.mockResolvedValue(remaining.map((amount) => ({ amount })));
    tx.charge.update.mockResolvedValue({ id: 1 });
    tx.auditLog.create.mockResolvedValue({ id: 1 });
  };

  it('estorna pagamento integral, preserva o original e reabre a cobrança', async () => {
    const { tx, prisma, service } = make(); arrange(tx);
    const result = await service.refundPayment(10, { reason: 'Lançamento incorreto' }, 7);
    expect(result.data).toMatchObject({ paymentId: 10, totalPaid: 0, balance: 100, status: ChargeStatus.PENDING });
    expect(tx.payment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 10, refundedAt: null } }));
    expect(prisma.payment.delete).not.toHaveBeenCalled();
    expect(prisma.payment.deleteMany).not.toHaveBeenCalled();
  });

  it('estorna pagamento parcial e restaura o saldo integral', async () => {
    const { tx, service } = make(); arrange(tx, payment(40));
    await expect(service.refundPayment(10, { reason: 'Valor incorreto' }, 7)).resolves.toHaveProperty('data.balance', 100);
    expect(tx.charge.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { status: ChargeStatus.PENDING } });
  });

  it('estorna apenas um entre vários pagamentos', async () => {
    const { tx, service } = make(); arrange(tx, payment(40), [60]);
    const result = await service.refundPayment(10, { reason: 'Cobrança incorreta' }, 7);
    expect(result.data).toMatchObject({ totalPaid: 60, balance: 40, status: ChargeStatus.PARTIALLY_PAID });
  });

  it('estorna o último pagamento válido sem considerar pagamentos já estornados', async () => {
    const { tx, service } = make(); arrange(tx, payment(60));
    const result = await service.refundPayment(10, { reason: 'Duplicidade' }, 7);
    expect(tx.payment.findMany).toHaveBeenCalledWith({ where: { chargeId: 1, refundedAt: null }, select: { amount: true } });
    expect(result.data.status).toBe(ChargeStatus.PENDING);
  });

  it('volta para OVERDUE quando não resta pagamento e a cobrança venceu', async () => {
    const { tx, service } = make(); arrange(tx, payment(100, { charge: { id: 1, finalAmount: 100, dueDate: new Date('2020-01-01'), status: ChargeStatus.PAID } }));
    await expect(service.refundPayment(10, { reason: 'Lançamento incorreto' }, 7)).resolves.toHaveProperty('data.status', ChargeStatus.OVERDUE);
  });

  it('rejeita segundo estorno', async () => {
    const { tx, service } = make(); arrange(tx, payment(100, { refundedAt: new Date() }));
    await expect(service.refundPayment(10, { reason: 'Novamente' }, 7)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.charge.update).not.toHaveBeenCalled();
  });

  it('rejeita pagamento inexistente', async () => {
    const { tx, service } = make(); tx.payment.findUnique.mockResolvedValue(null);
    await expect(service.refundPayment(999, { reason: 'Não localizado' }, 7)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('exige motivo não vazio no servidor', async () => {
    const { tx, service } = make();
    await expect(service.refundPayment(10, { reason: '   ' }, 7)).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.payment.findUnique).not.toHaveBeenCalled();
  });

  it('rejeita cobrança cancelada', async () => {
    const { tx, service } = make(); arrange(tx, payment(100, { charge: { id: 1, finalAmount: 100, dueDate: future, status: ChargeStatus.CANCELLED } }));
    await expect(service.refundPayment(10, { reason: 'Cancelada' }, 7)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejeita cobrança com estado financeiro inválido para estorno', async () => {
    const { tx, service } = make(); arrange(tx, payment(100, { charge: { id: 1, finalAmount: 100, dueDate: future, status: ChargeStatus.REFUNDED } }));
    await expect(service.refundPayment(10, { reason: 'Estado inválido' }, 7)).rejects.toBeInstanceOf(ConflictException);
  });

  it('registra auditoria do estorno e da correção financeira', async () => {
    const { tx, service } = make(); arrange(tx);
    await service.refundPayment(10, { reason: 'Lançamento incorreto' }, 7);
    expect(tx.auditLog.create).toHaveBeenNthCalledWith(1, { data: expect.objectContaining({ userId: 7, action: 'PAYMENT_REFUNDED', entity: 'Payment', entityId: '10' }) });
    expect(tx.auditLog.create).toHaveBeenNthCalledWith(2, { data: expect.objectContaining({ userId: 7, action: 'FINANCIAL_CORRECTION', entity: 'Charge', entityId: '1' }) });
  });

  it('propaga falha da cobrança para rollback da transação', async () => {
    const { tx, prisma, service } = make(); arrange(tx); tx.charge.update.mockRejectedValue(new Error('database failure'));
    await expect(service.refundPayment(10, { reason: 'Lançamento incorreto' }, 7)).rejects.toThrow('database failure');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it('permite apenas um vencedor em dois estornos concorrentes', async () => {
    const { tx, service } = make(); arrange(tx); tx.payment.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    const results = await Promise.allSettled([
      service.refundPayment(10, { reason: 'Primeiro' }, 7), service.refundPayment(10, { reason: 'Segundo' }, 8),
    ]);
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(1);
  });
});
