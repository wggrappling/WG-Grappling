import { Module } from '@nestjs/common';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ChargeModule } from '../charge/charge.module';

@Module({
  imports: [PrismaModule, ChargeModule],
  controllers: [EnrollmentController],
  providers: [EnrollmentService],
})
export class EnrollmentModule {}
