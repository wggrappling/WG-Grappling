import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { ClassService } from './class.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Class')
@UseGuards(JwtAuthGuard)
@Controller('class')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas as turmas' })
  @ApiResponse({ status: 200, description: 'Lista de turmas retornada com sucesso.' })
  findAll() {
    return this.classService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar turma por ID' })
  @ApiParam({ name: 'id', description: 'ID da turma' })
  @ApiResponse({ status: 200, description: 'Turma retornada com sucesso.' })
  findOne(@Param('id') id: string) {
    return this.classService.findOne(Number(id));
  }

  @Get(':classId/students')
  @ApiOperation({ summary: 'Listar alunos vinculados a uma turma' })
  @ApiParam({ name: 'classId', description: 'ID da turma' })
  @ApiResponse({ status: 200, description: 'Lista de alunos retornada com sucesso.' })
  @ApiResponse({ status: 404, description: 'Turma não encontrada.' })
  getStudentsByClassId(@Param('classId') classId: string) {
    return this.classService.getStudentsByClassId(Number(classId));
  }

  @Post()
  @ApiOperation({ summary: 'Criar nova turma' })
  @ApiBody({ type: CreateClassDto })
  @ApiResponse({ status: 201, description: 'Turma criada com sucesso.' })
  create(@Body() createClassDto: CreateClassDto) {
    return this.classService.create(createClassDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar turma' })
  @ApiParam({ name: 'id', description: 'ID da turma' })
  @ApiBody({ type: UpdateClassDto })
  @ApiResponse({ status: 200, description: 'Turma atualizada com sucesso.' })
  update(@Param('id') id: string, @Body() updateClassDto: UpdateClassDto) {
    return this.classService.update(Number(id), updateClassDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover turma' })
  @ApiParam({ name: 'id', description: 'ID da turma' })
  @ApiResponse({ status: 200, description: 'Turma removida com sucesso.' })
  remove(@Param('id') id: string) {
    return this.classService.remove(Number(id));
  }
}
