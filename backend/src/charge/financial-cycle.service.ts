import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChargeGeneratorService } from './charge-generator.service';
import { ChargeService } from './charge.service';

export type FinancialCycleSummary = {
  processed: number;
  generated: number;
  overdueUpdated: number;
  skipped: number;
  errors: number;
};

@Injectable()
export class FinancialCycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chargeService: ChargeService,
    private readonly generator: ChargeGeneratorService,
  ) {}

  async run(now = new Date()): Promise<FinancialCycleSummary> {
    return this.prisma.$transaction(async (tx) => {
      const lock = await tx.$queryRaw<Array<{ locked: boolean }>>(
        Prisma.sql`SELECT pg_try_advisory_xact_lock(1196843846) AS locked`,
      );
      if (!lock[0]?.locked) {
        return { processed: 0, generated: 0, overdueUpdated: 0, skipped: 1, errors: 0 };
      }

      const overdue = await this.chargeService.markOverdue(now, tx);
      const generation = await this.generator.generateMonthlyCharges(tx, now);
      const summary = {
        processed: generation.processed,
        generated: generation.generated,
        overdueUpdated: overdue.count,
        skipped: generation.skipped,
        errors: generation.errors,
      };

      if (overdue.count > 0) {
        await tx.auditLog.create({ data: { action: 'CHARGES_MARKED_OVERDUE', entity: 'Charge', metadata: { count: overdue.count, executedAt: now.toISOString() } } });
      }
      if (generation.generated > 0) {
        await tx.auditLog.create({ data: { action: 'MONTHLY_CHARGES_GENERATED', entity: 'Charge', metadata: { referenceMonth: generation.referenceMonth, count: generation.generated } } });
      }
      await tx.auditLog.create({ data: { action: 'FINANCIAL_CYCLE_EXECUTED', entity: 'FinancialCycle', metadata: { ...summary, referenceMonth: generation.referenceMonth, executedAt: now.toISOString(), result: 'SUCCESS' } } });
      return summary;
    }, { isolationLevel: 'Serializable' });
  }
}
