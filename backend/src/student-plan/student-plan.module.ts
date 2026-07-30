import { Module } from '@nestjs/common';
import { StudentPlanController } from './student-plan.controller';
import { StudentPlanService } from './student-plan.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StudentPlanController],
  providers: [StudentPlanService],
})
export class StudentPlanModule {}
