import { Module } from '@nestjs/common';
import { StudentClassController } from './student-class.controller';
import { StudentClassService } from './student-class.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StudentClassController],
  providers: [StudentClassService],
})
export class StudentClassModule {}
