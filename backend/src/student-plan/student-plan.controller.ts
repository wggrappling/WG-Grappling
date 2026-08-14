import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { StudentPlanService } from './student-plan.service';
import { CreateStudentPlanDto } from './dto/create-student-plan.dto';
import { UpdateStudentPlanDto } from './dto/update-student-plan.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../generated/prisma/enums';
import { Audit } from '../audit/audit.decorator';

@ApiTags('StudentPlan')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
@Controller('student-plan')
export class StudentPlanController {
  constructor(private readonly studentPlanService: StudentPlanService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas as associações de estudante e plano' })
  @ApiResponse({ status: 200, description: 'Lista retornada com sucesso.' })
  findAll() {
    return this.studentPlanService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar associação por ID' })
  @ApiParam({ name: 'id', description: 'ID da associação' })
  @ApiResponse({ status: 200, description: 'Associação retornada com sucesso.' })
  findOne(@Param('id') id: string) {
    return this.studentPlanService.findOne(Number(id));
  }

  @Post()
  @Audit({ action: 'CHANGE_PLAN', entity: 'StudentPlan' })
  @ApiOperation({ summary: 'Criar nova associação estudante-plano' })
  @ApiBody({ type: CreateStudentPlanDto })
  @ApiResponse({ status: 201, description: 'Associação criada com sucesso.' })
  create(@Body() createStudentPlanDto: CreateStudentPlanDto) {
    return this.studentPlanService.create(createStudentPlanDto);
  }

  @Patch(':id')
  @Audit({ action: 'CHANGE_PLAN', entity: 'StudentPlan', entityIdParam: 'id' })
  @ApiOperation({ summary: 'Atualizar associação estudante-plano' })
  @ApiParam({ name: 'id', description: 'ID da associação' })
  @ApiBody({ type: UpdateStudentPlanDto })
  @ApiResponse({ status: 200, description: 'Associação atualizada com sucesso.' })
  update(@Param('id') id: string, @Body() updateStudentPlanDto: UpdateStudentPlanDto) {
    return this.studentPlanService.update(Number(id), updateStudentPlanDto);
  }

  @Delete(':id')
  @Audit({ action: 'END_PLAN', entity: 'StudentPlan', entityIdParam: 'id' })
  @ApiOperation({ summary: 'Remover associação estudante-plano' })
  @ApiParam({ name: 'id', description: 'ID da associação' })
  @ApiResponse({ status: 200, description: 'Associação removida com sucesso.' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.studentPlanService.remove(Number(id), req.user?.id);
  }
}
