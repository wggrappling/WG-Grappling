import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ChargeController } from './charge.controller';
import { ChargeService } from './charge.service';
import { ChargeGeneratorService } from './charge-generator.service';

@Module({
  imports: [PrismaModule],
  controllers: [ChargeController],
  providers: [ChargeService, ChargeGeneratorService],
  exports: [ChargeGeneratorService],
})
export class ChargeModule {}
