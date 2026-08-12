import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EnrollmentService } from './enrollment.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../generated/prisma/enums';

@ApiTags('Enrollment')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('enrollments')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION)
  @ApiOperation({ summary: 'Realizar matrícula completa do aluno' })
  @ApiResponse({ status: 201, description: 'Matrícula realizada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos para matrícula.' })
  @ApiResponse({ status: 404, description: 'Student, Plan, Modality ou Class não encontrado.' })
  create(@Body() createEnrollmentDto: CreateEnrollmentDto) {
    return this.enrollmentService.create(createEnrollmentDto);
  }
}
