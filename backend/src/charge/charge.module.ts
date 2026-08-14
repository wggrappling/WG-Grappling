import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ChargeController } from './charge.controller';
import { ChargeService } from './charge.service';
import { ChargeGeneratorService } from './charge-generator.service';
import { FinancialCycleService } from './financial-cycle.service';
import { FinancialCycleScheduler } from './financial-cycle.scheduler';

@Module({
  imports: [PrismaModule],
  controllers: [ChargeController],
  providers: [ChargeService, ChargeGeneratorService, FinancialCycleService, FinancialCycleScheduler],
  exports: [ChargeGeneratorService, FinancialCycleService],
})
export class ChargeModule {}
