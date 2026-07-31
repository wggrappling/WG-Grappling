import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StudentClassService } from './student-class.service';
import { CreateStudentClassDto } from './dto/create-student-class.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('StudentClass')
@UseGuards(JwtAuthGuard)
@Controller('student-classes')
export class StudentClassController {
  constructor(private readonly studentClassService: StudentClassService) {}

  @Post()
  @ApiOperation({ summary: 'Associar um aluno a uma turma' })
  @ApiBody({ type: CreateStudentClassDto })
  @ApiResponse({ status: 201, description: 'Associação criada com sucesso.' })
  create(@Body() createStudentClassDto: CreateStudentClassDto) {
    return this.studentClassService.create(createStudentClassDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as associações aluno-turma' })
  @ApiResponse({ status: 200, description: 'Lista retornada com sucesso.' })
  findAll() {
    return this.studentClassService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar associação aluno-turma por ID' })
  @ApiParam({ name: 'id', description: 'ID da associação' })
  @ApiResponse({ status: 200, description: 'Associação retornada com sucesso.' })
  findOne(@Param('id') id: string) {
    return this.studentClassService.findOne(Number(id));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover associação aluno-turma' })
  @ApiParam({ name: 'id', description: 'ID da associação' })
  @ApiResponse({ status: 200, description: 'Associação removida com sucesso.' })
  remove(@Param('id') id: string) {
    return this.studentClassService.remove(Number(id));
  }
}
