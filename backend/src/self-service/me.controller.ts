import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../generated/prisma/enums';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedContext } from './context/authenticated-context.decorator';
import type { AuthenticatedUserContext } from './context/authenticated-user-context';
import { StudentContextGuard } from './context/student-context.guard';
import { MeProjectionDto } from './dto/me-projection.dto';
import { SelfProfileProjectionDto } from './dto/self-profile-projection.dto';
import { MeService } from './me.service';
import { SelfAcademicService } from './self-academic.service';
import {
  SelfAttendanceProjectionDto,
  SelfFinanceProjectionDto,
  SelfGraduationsProjectionDto,
  SelfModalitiesProjectionDto,
} from './dto/self-academic-projections.dto';
import { SelfAttendanceQueryDto } from './dto/self-attendance-query.dto';

@ApiTags('Self-Service')
@ApiBearerAuth('access-token')
@Controller('me')
@UseGuards(JwtAuthGuard, RolesGuard, StudentContextGuard)
@Roles(UserRole.ALUNO)
export class MeController {
  constructor(
    private readonly meService: MeService,
    private readonly academicService: SelfAcademicService,
  ) {}

  @Get()
  @ApiOkResponse({ type: MeProjectionDto })
  getMe(@AuthenticatedContext() context: AuthenticatedUserContext) {
    return this.meService.getMe(context);
  }

  @Get('profile')
  @ApiOkResponse({ type: SelfProfileProjectionDto })
  getProfile(@AuthenticatedContext() context: AuthenticatedUserContext) {
    return this.meService.getProfile(context);
  }

  @Get('graduations')
  @ApiOkResponse({ type: SelfGraduationsProjectionDto })
  getGraduations(@AuthenticatedContext() context: AuthenticatedUserContext) {
    return this.academicService.getGraduations(context);
  }

  @Get('modalities')
  @ApiOkResponse({ type: SelfModalitiesProjectionDto })
  getModalities(@AuthenticatedContext() context: AuthenticatedUserContext) {
    return this.academicService.getModalities(context);
  }

  @Get('attendance')
  @ApiOkResponse({ type: SelfAttendanceProjectionDto })
  getAttendance(
    @AuthenticatedContext() context: AuthenticatedUserContext,
    @Query() query: SelfAttendanceQueryDto,
  ) {
    return this.academicService.getAttendance(context, query);
  }

  @Get('finance')
  @ApiOkResponse({ type: SelfFinanceProjectionDto })
  getFinance(@AuthenticatedContext() context: AuthenticatedUserContext) {
    return this.academicService.getFinance(context);
  }
}
