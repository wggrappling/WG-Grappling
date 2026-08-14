import { ChargeStatus } from '../../generated/prisma/enums';
import { ChargeService } from './charge.service';

describe('ChargeService overdue policy', () => {
  const prisma = { charge: { updateMany: jest.fn() } };
  const service = new ChargeService(prisma as never);

  it('atualiza somente PENDING vencida sem tocar valores, pagamentos ou outros status', async () => {
    const now = new Date('2026-09-15T12:00:00.000Z');
    prisma.charge.updateMany.mockResolvedValue({ count: 2 });
    await expect(service.markOverdue(now)).resolves.toEqual({ count: 2 });
    expect(prisma.charge.updateMany).toHaveBeenCalledWith({
      where: { status: ChargeStatus.PENDING, dueDate: { lt: now } },
      data: { status: ChargeStatus.OVERDUE },
    });
  });
});
