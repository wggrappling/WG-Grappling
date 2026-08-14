import { Body, Controller, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EnrollmentService } from './enrollment.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../generated/prisma/enums';
import { MaintainEnrollmentDto } from './dto/maintain-enrollment.dto';
import { Audit } from '../audit/audit.decorator';

@ApiTags('Enrollment')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('enrollments')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  @Audit({ action: 'CREATE', entity: 'Enrollment' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION)
  @ApiOperation({ summary: 'Realizar matrícula completa do aluno' })
  @ApiResponse({ status: 201, description: 'Matrícula realizada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos para matrícula.' })
  @ApiResponse({ status: 404, description: 'Student, Plan, Modality ou Class não encontrado.' })
  create(@Body() createEnrollmentDto: CreateEnrollmentDto, @Request() req: any) {
    return this.enrollmentService.create(createEnrollmentDto, req.user?.id);
  }

  @Patch(':studentId')
  @Audit({ action: 'UPDATE', entity: 'Enrollment', entityIdParam: 'studentId' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION)
  @ApiOperation({ summary: 'Manutenção transacional dos dados e vínculos da matrícula' })
  maintain(@Param('studentId') studentId: string, @Body() dto: MaintainEnrollmentDto, @Request() req: any) {
    return this.enrollmentService.maintain(Number(studentId), dto, req.user?.id);
  }
}
