import { Module } from '@nestjs/common';
import { StudentModalityController } from './student-modality.controller';
import { StudentModalityService } from './student-modality.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StudentModalityController],
  providers: [StudentModalityService],
})
export class StudentModalityModule {}
