import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AttendanceReportQueryDto, FinancialReportQueryDto, GraduationReportQueryDto, StudentReportQueryDto } from './dto/report-query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}
  @Get('students') students(@Query() query: StudentReportQueryDto) { return this.reports.students(query); }
  @Get('financial') financial(@Query() query: FinancialReportQueryDto) { return this.reports.financial(query); }
  @Get('attendance') attendance(@Query() query: AttendanceReportQueryDto) { return this.reports.attendance(query); }
  @Get('graduations') graduations(@Query() query: GraduationReportQueryDto) { return this.reports.graduations(query); }
}
