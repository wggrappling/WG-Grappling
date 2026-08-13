import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../generated/prisma/enums';
import { StudentQueryDto } from './dto/student-query.dto';

@ApiTags('Students')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos os estudantes' })
  @ApiResponse({ status: 200, description: 'Lista de estudantes retornada com sucesso.' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION, UserRole.TEACHER)
  findAll(@Request() req: any, @Query() query: StudentQueryDto) {
    return this.studentsService.findAll(req.user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar estudante por ID' })
  @ApiParam({ name: 'id', description: 'ID do estudante' })
  @ApiResponse({ status: 200, description: 'Estudante retornado com sucesso.' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION, UserRole.TEACHER)
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.studentsService.findOne(Number(id), req.user);
  }

  @Get(':id/history')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION, UserRole.TEACHER)
  history(@Param('id') id: string, @Request() req: any) { return this.studentsService.history(Number(id), req.user); }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION)
  @ApiOperation({ summary: 'Criar novo estudante' })
  @ApiBody({ type: CreateStudentDto })
  @ApiResponse({ status: 201, description: 'Estudante criado com sucesso.' })
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.create(createStudentDto);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar estudante' })
  @ApiParam({ name: 'id', description: 'ID do estudante' })
  @ApiBody({ type: UpdateStudentDto })
  @ApiResponse({ status: 200, description: 'Estudante atualizado com sucesso.' })
  update(@Param('id') id: string, @Body() updateStudentDto: UpdateStudentDto) {
    return this.studentsService.update(Number(id), updateStudentDto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Remover estudante' })
  @ApiParam({ name: 'id', description: 'ID do estudante' })
  @ApiResponse({ status: 200, description: 'Estudante removido com sucesso.' })
  remove(@Param('id') id: string) {
    return this.studentsService.remove(Number(id));
  }
}
