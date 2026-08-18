import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { ClassService } from './class.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../generated/prisma/enums';
import { Audit } from '../audit/audit.decorator';

@ApiTags('Class')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('class')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas as turmas' })
  @ApiResponse({ status: 200, description: 'Lista de turmas retornada com sucesso.' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION, UserRole.TEACHER)
  findAll(@Request() req: any) {
    return this.classService.findAll(req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar turma por ID' })
  @ApiParam({ name: 'id', description: 'ID da turma' })
  @ApiResponse({ status: 200, description: 'Turma retornada com sucesso.' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION, UserRole.TEACHER)
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.classService.findOne(Number(id), req.user);
  }

  @Get(':classId/students')
  @ApiOperation({ summary: 'Listar alunos vinculados a uma turma' })
  @ApiParam({ name: 'classId', description: 'ID da turma' })
  @ApiResponse({ status: 200, description: 'Lista de alunos retornada com sucesso.' })
  @ApiResponse({ status: 404, description: 'Turma não encontrada.' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION, UserRole.TEACHER)
  getStudentsByClassId(@Param('classId') classId: string, @Request() req: any) {
    return this.classService.getStudentsByClassId(Number(classId), req.user);
  }

  @Post()
  @Audit({ action: 'CREATE', entity: 'Class' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Criar nova turma' })
  @ApiBody({ type: CreateClassDto })
  @ApiResponse({ status: 201, description: 'Turma criada com sucesso.' })
  create(@Body() createClassDto: CreateClassDto) {
    return this.classService.create(createClassDto);
  }

  @Patch(':id')
  @Audit({ action: 'UPDATE', entity: 'Class', entityIdParam: 'id' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar turma' })
  @ApiParam({ name: 'id', description: 'ID da turma' })
  @ApiBody({ type: UpdateClassDto })
  @ApiResponse({ status: 200, description: 'Turma atualizada com sucesso.' })
  update(@Param('id') id: string, @Body() updateClassDto: UpdateClassDto) {
    return this.classService.update(Number(id), updateClassDto);
  }

  @Delete(':id')
  @Audit({ action: 'DELETE', entity: 'Class', entityIdParam: 'id' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Remover turma' })
  @ApiParam({ name: 'id', description: 'ID da turma' })
  @ApiResponse({ status: 200, description: 'Turma removida com sucesso.' })
  remove(@Param('id') id: string) {
    return this.classService.remove(Number(id));
  }
}
