import { FinancialCycleService } from './financial-cycle.service';

describe('FinancialCycleService', () => {
  const tx = { $queryRaw: jest.fn(), auditLog: { create: jest.fn() } };
  const prisma = { $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) };
  const chargeService = { markOverdue: jest.fn() };
  const generator = { generateMonthlyCharges: jest.fn() };
  const service = new FinancialCycleService(prisma as never, chargeService as never, generator as never);
  const now = new Date('2026-09-15T12:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
    tx.$queryRaw.mockResolvedValue([{ locked: true }]);
    chargeService.markOverdue.mockResolvedValue({ count: 2 });
    generator.generateMonthlyCharges.mockResolvedValue({ processed: 5, generated: 3, skipped: 2, errors: 0, referenceMonth: '2026-09' });
  });

  it('atualiza overdue, gera mensalidades e retorna resumo correto na mesma transação', async () => {
    await expect(service.run(now)).resolves.toEqual({ processed: 5, generated: 3, overdueUpdated: 2, skipped: 2, errors: 0 });
    expect(chargeService.markOverdue).toHaveBeenCalledWith(now, tx);
    expect(generator.generateMonthlyCharges).toHaveBeenCalledWith(tx, now);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
  });

  it('registra auditoria somente para mudanças efetivas e sempre para o ciclo', async () => {
    await service.run(now);
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'CHARGES_MARKED_OVERDUE' }) }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'MONTHLY_CHARGES_GENERATED' }) }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'FINANCIAL_CYCLE_EXECUTED' }) }));
  });

  it('não executa ciclo concorrente quando o advisory lock está ocupado', async () => {
    tx.$queryRaw.mockResolvedValue([{ locked: false }]);
    await expect(service.run(now)).resolves.toEqual({ processed: 0, generated: 0, overdueUpdated: 0, skipped: 1, errors: 0 });
    expect(chargeService.markOverdue).not.toHaveBeenCalled();
    expect(generator.generateMonthlyCharges).not.toHaveBeenCalled();
  });

  it('propaga erro para rollback integral', async () => {
    generator.generateMonthlyCharges.mockRejectedValue(new Error('generation failed'));
    await expect(service.run(now)).rejects.toThrow('generation failed');
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});
