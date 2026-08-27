import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { AddressModule } from './address/address.module';
import { ResponsibleModule } from './responsible/responsible.module';
import { DocumentsModule } from './documents/documents.module';
import { envValidationSchema } from './config/env.validation';
import { GraduationModule } from './graduation/graduation.module';
import { AuditModule } from './audit/audit.module';
import { ScheduleModule } from '@nestjs/schedule';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/reports.module';
import { SelfServiceModule } from './self-service/self-service.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: false,
        abortEarly: true,
      },
    }),
    ScheduleModule.forRoot(),
    PeopleModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    StudentsModule,
    ModalityModule,
    StudentModalityModule,
    PlansModule,
    StudentPlanModule,
    ClassModule,
    AttendanceModule,
    EnrollmentModule,
    StudentClassModule,
    ChargeModule,
    AddressModule,
    ResponsibleModule,
    DocumentsModule,
    GraduationModule,
    AuditModule,
    DashboardModule,
    ReportsModule,
    SelfServiceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
