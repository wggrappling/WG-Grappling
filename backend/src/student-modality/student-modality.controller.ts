import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { StudentModalityService } from './student-modality.service';
import { CreateStudentModalityDto } from './dto/create-student-modality.dto';
import { UpdateStudentModalityDto } from './dto/update-student-modality.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../generated/prisma/enums';

@ApiTags('StudentModality')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
@Controller('student-modality')
export class StudentModalityController {
  constructor(private readonly studentModalityService: StudentModalityService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas as associações de estudante e modalidade' })
  @ApiResponse({ status: 200, description: 'Lista retornada com sucesso.' })
  findAll() {
    return this.studentModalityService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar associação por ID' })
  @ApiParam({ name: 'id', description: 'ID da associação' })
  @ApiResponse({ status: 200, description: 'Associação retornada com sucesso.' })
  findOne(@Param('id') id: string) {
    return this.studentModalityService.findOne(Number(id));
  }

  @Post()
  @ApiOperation({ summary: 'Criar nova associação estudante-modalidade' })
  @ApiBody({ type: CreateStudentModalityDto })
  @ApiResponse({ status: 201, description: 'Associação criada com sucesso.' })
  create(@Body() createStudentModalityDto: CreateStudentModalityDto) {
    return this.studentModalityService.create(createStudentModalityDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar associação estudante-modalidade' })
  @ApiParam({ name: 'id', description: 'ID da associação' })
  @ApiBody({ type: UpdateStudentModalityDto })
  @ApiResponse({ status: 200, description: 'Associação atualizada com sucesso.' })
  update(@Param('id') id: string, @Body() updateStudentModalityDto: UpdateStudentModalityDto) {
    return this.studentModalityService.update(Number(id), updateStudentModalityDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover associação estudante-modalidade' })
  @ApiParam({ name: 'id', description: 'ID da associação' })
  @ApiResponse({ status: 200, description: 'Associação removida com sucesso.' })
  remove(@Param('id') id: string) {
    return this.studentModalityService.remove(Number(id));
  }
}
