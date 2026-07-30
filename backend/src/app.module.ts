import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PeopleModule } from './people/people.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { StudentsModule } from './students/students.module';
import { ModalityModule } from './modality/modality.module';
import { StudentModalityModule } from './student-modality/student-modality.module';
import { PlansModule } from './plans/plans.module';
import { StudentPlanModule } from './student-plan/student-plan.module';
import { ClassModule } from './class/class.module';
import { AttendanceModule } from './attendance/attendance.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { StudentClassModule } from './student-class/student-class.module';
import { ChargeModule } from './charge/charge.module';

@Module({
  imports: [PeopleModule, PrismaModule, UsersModule, AuthModule, StudentsModule, ModalityModule, StudentModalityModule, PlansModule, StudentPlanModule, ClassModule, AttendanceModule, EnrollmentModule, StudentClassModule, ChargeModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
