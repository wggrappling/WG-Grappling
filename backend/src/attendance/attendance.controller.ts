import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { CreateAttendanceBatchDto } from './dto/create-attendance-batch.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../generated/prisma/enums';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { Audit } from '../audit/audit.decorator';

@ApiTags('Attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos os registros de presença' })
  @ApiResponse({ status: 200, description: 'Lista de presenças retornada com sucesso.' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION, UserRole.TEACHER)
  findAll(@Query() query: AttendanceQueryDto, @Request() req: any) {
    return this.attendanceService.findAll(query, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar registro de presença por ID' })
  @ApiParam({ name: 'id', description: 'ID do registro' })
  @ApiResponse({ status: 200, description: 'Registro retornado com sucesso.' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION, UserRole.TEACHER)
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.attendanceService.findOne(Number(id), req.user);
  }

  @Post()
  @Audit({ action: 'REGISTER', entity: 'Attendance' })
  @ApiOperation({ summary: 'Criar novo registro de presença' })
  @ApiBody({ type: CreateAttendanceDto })
  @ApiResponse({ status: 201, description: 'Registro criado com sucesso.' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION, UserRole.TEACHER)
  create(@Body() createAttendanceDto: CreateAttendanceDto, @Request() req: any) {
    return this.attendanceService.create(createAttendanceDto, req.user);
  }

  @Post('batch')
  @Audit({ action: 'REGISTER_BATCH', entity: 'Attendance' })
  @ApiOperation({ summary: 'Registrar presença de toda a turma em uma única operação' })
  @ApiBody({ type: CreateAttendanceBatchDto })
  @ApiResponse({ status: 201, description: 'Presenças registradas com sucesso.' })
  @ApiResponse({ status: 404, description: 'Turma não encontrada.' })
  @ApiResponse({ status: 409, description: 'Algum aluno já possui presença registrada para esta turma e data.' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION, UserRole.TEACHER)
  createBatch(@Body() createAttendanceBatchDto: CreateAttendanceBatchDto, @Request() req: any) {
    return this.attendanceService.createBatch(createAttendanceBatchDto, req.user);
  }

  @Patch(':id')
  @Audit({ action: 'UPDATE', entity: 'Attendance', entityIdParam: 'id' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar registro de presença' })
  @ApiParam({ name: 'id', description: 'ID do registro' })
  @ApiBody({ type: UpdateAttendanceDto })
  @ApiResponse({ status: 200, description: 'Registro atualizado com sucesso.' })
  update(@Param('id') id: string, @Body() updateAttendanceDto: UpdateAttendanceDto) {
    return this.attendanceService.update(Number(id), updateAttendanceDto);
  }

  @Delete(':id')
  @Audit({ action: 'DELETE', entity: 'Attendance', entityIdParam: 'id' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Remover registro de presença' })
  @ApiParam({ name: 'id', description: 'ID do registro' })
  @ApiResponse({ status: 200, description: 'Registro removido com sucesso.' })
  remove(@Param('id') id: string) {
    return this.attendanceService.remove(Number(id));
  }
}
