import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@ApiTags('Students')
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos os estudantes' })
  @ApiResponse({ status: 200, description: 'Lista de estudantes retornada com sucesso.' })
  findAll() {
    return this.studentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar estudante por ID' })
  @ApiParam({ name: 'id', description: 'ID do estudante' })
  @ApiResponse({ status: 200, description: 'Estudante retornado com sucesso.' })
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(Number(id));
  }

  @Post()
  @ApiOperation({ summary: 'Criar novo estudante' })
  @ApiBody({ type: CreateStudentDto })
  @ApiResponse({ status: 201, description: 'Estudante criado com sucesso.' })
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.create(createStudentDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar estudante' })
  @ApiParam({ name: 'id', description: 'ID do estudante' })
  @ApiBody({ type: UpdateStudentDto })
  @ApiResponse({ status: 200, description: 'Estudante atualizado com sucesso.' })
  update(@Param('id') id: string, @Body() updateStudentDto: UpdateStudentDto) {
    return this.studentsService.update(Number(id), updateStudentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover estudante' })
  @ApiParam({ name: 'id', description: 'ID do estudante' })
  @ApiResponse({ status: 200, description: 'Estudante removido com sucesso.' })
  remove(@Param('id') id: string) {
    return this.studentsService.remove(Number(id));
  }
}
