import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StudentClassService } from './student-class.service';
import { CreateStudentClassDto } from './dto/create-student-class.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../generated/prisma/enums';
import { Audit } from '../audit/audit.decorator';

@ApiTags('StudentClass')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
@Controller('student-classes')
export class StudentClassController {
  constructor(private readonly studentClassService: StudentClassService) {}

  @Post()
  @Audit({ action: 'CREATE', entity: 'StudentClass' })
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
  @Audit({ action: 'FINISH', entity: 'StudentClass', entityIdParam: 'id' })
  @ApiOperation({ summary: 'Encerrar associação aluno-turma' })
  @ApiParam({ name: 'id', description: 'ID da associação' })
  @ApiResponse({ status: 200, description: 'Associação encerrada com sucesso.' })
  remove(@Param('id') id: string) {
    return this.studentClassService.remove(Number(id));
  }
}
