import { ConflictException } from '@nestjs/common';
import { ChargeStatus } from '../../generated/prisma/enums';
import { ChargeService } from './charge.service';

describe('ChargeService lifecycle safety', () => {
  const prisma = {
    charge: { findUnique: jest.fn(), update: jest.fn() },
  };
  const service = new ChargeService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('cancela cobrança PENDING sem apagar o registro', async () => {
    prisma.charge.findUnique.mockResolvedValue({ id: 1, status: ChargeStatus.PENDING, payments: [] });
    await service.remove(1);
    expect(prisma.charge.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { status: ChargeStatus.CANCELLED } });
  });

  it('preserva cobrança paga ao rejeitar cancelamento', async () => {
    prisma.charge.findUnique.mockResolvedValue({ id: 1, status: ChargeStatus.PAID, payments: [{ amount: 100 }] });
    await expect(service.remove(1)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.charge.update).not.toHaveBeenCalled();
  });

  it('rejeita alteração de cobrança com pagamento', async () => {
    prisma.charge.findUnique.mockResolvedValue({ id: 1, status: ChargeStatus.PARTIALLY_PAID, payments: [{ amount: 30 }] });
    await expect(service.update(1, { description: 'correção' })).rejects.toBeInstanceOf(ConflictException);
  });
});
