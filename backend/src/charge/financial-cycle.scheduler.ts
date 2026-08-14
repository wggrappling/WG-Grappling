import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { FinancialCycleService } from './financial-cycle.service';

const JOB_NAME = 'financial-cycle';

@Injectable()
export class FinancialCycleScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FinancialCycleScheduler.name);

  constructor(
    private readonly cycle: FinancialCycleService,
    private readonly config: ConfigService,
    private readonly registry: SchedulerRegistry,
  ) {}

  onModuleInit() {
    if (!this.config.get<boolean>('FINANCIAL_CYCLE_ENABLED')) return;
    const job = CronJob.from({
      cronTime: this.config.get<string>('FINANCIAL_CYCLE_CRON') ?? '0 5 * * *',
      timeZone: this.config.get<string>('FINANCIAL_CYCLE_TIME_ZONE') ?? 'America/Sao_Paulo',
      onTick: () => void this.execute(),
      start: true,
    });
    this.registry.addCronJob(JOB_NAME, job);
  }

  onModuleDestroy() {
    if (this.registry.doesExist('cron', JOB_NAME)) this.registry.deleteCronJob(JOB_NAME);
  }

  async execute() {
    try {
      const result = await this.cycle.run();
      this.logger.log(`Ciclo financeiro concluído: processed=${result.processed}, generated=${result.generated}, overdueUpdated=${result.overdueUpdated}, skipped=${result.skipped}, errors=${result.errors}`);
    } catch {
      this.logger.error('Falha na execução automática do ciclo financeiro.');
    }
  }
}
