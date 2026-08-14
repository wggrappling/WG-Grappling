import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ChargeStatus, PaymentMethod } from '../../generated/prisma/enums';
import { ChargeService } from './charge.service';

describe('ChargeService payments', () => {
  const tx = {
    charge: { findUnique: jest.fn(), update: jest.fn() },
    payment: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = {
    charge: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    payment: { findMany: jest.fn() },
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const service = new ChargeService(prisma as never);
  const dto = { amount: 100, method: PaymentMethod.PIX, paidAt: '2026-08-12T00:00:00.000Z' };

  beforeEach(() => {
    jest.clearAllMocks();
    tx.charge.findUnique.mockResolvedValue({ id: 1, finalAmount: 100, status: ChargeStatus.PENDING, payments: [] });
    tx.payment.create.mockResolvedValue({ id: 10, chargeId: 1, amount: 100 });
    tx.charge.update.mockResolvedValue({ id: 1 });
  });

  it('registra pagamento integral e marca como PAID', async () => {
    const result = await service.registerPayment(1, dto, 7);
    expect(result.data).toMatchObject({ totalPaid: 100, balance: 0, status: ChargeStatus.PAID });
    expect(tx.charge.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { status: ChargeStatus.PAID } });
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: 7, action: 'PAYMENT_REGISTERED', entityId: '10' }) }));
  });

  it('registra pagamento parcial e marca como PARTIALLY_PAID', async () => {
    const result = await service.registerPayment(1, { ...dto, amount: 40 });
    expect(result.data).toMatchObject({ totalPaid: 40, balance: 60, status: ChargeStatus.PARTIALLY_PAID });
  });

  it('rejeita pagamento acima do saldo', async () => {
    await expect(service.registerPayment(1, { ...dto, amount: 101 })).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.payment.create).not.toHaveBeenCalled();
  });

  it('rejeita cobrança inexistente', async () => {
    tx.charge.findUnique.mockResolvedValue(null);
    await expect(service.registerPayment(999, dto)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejeita cobrança já quitada', async () => {
    tx.charge.findUnique.mockResolvedValue({ id: 1, finalAmount: 100, status: ChargeStatus.PAID, payments: [{ amount: 100 }] });
    await expect(service.registerPayment(1, dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('soma múltiplos pagamentos ao calcular saldo e status', async () => {
    tx.charge.findUnique.mockResolvedValue({ id: 1, finalAmount: 100, status: ChargeStatus.PARTIALLY_PAID, payments: [{ amount: 20 }, { amount: 30 }] });
    const result = await service.registerPayment(1, { ...dto, amount: 50 });
    expect(result.data).toMatchObject({ totalPaid: 100, balance: 0, status: ChargeStatus.PAID });
  });

  it('mantém status parcial quando múltiplos pagamentos não quitam a cobrança', async () => {
    tx.charge.findUnique.mockResolvedValue({ id: 1, finalAmount: 100, status: ChargeStatus.PARTIALLY_PAID, payments: [{ amount: 20 }] });
    const result = await service.registerPayment(1, { ...dto, amount: 30 });
    expect(result.data.status).toBe(ChargeStatus.PARTIALLY_PAID);
  });

  it('propaga falha da atualização para rollback da transação', async () => {
    tx.charge.update.mockRejectedValue(new Error('database failure'));
    await expect(service.registerPayment(1, dto)).rejects.toThrow('database failure');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.payment.create).toHaveBeenCalledTimes(1);
  });
});
