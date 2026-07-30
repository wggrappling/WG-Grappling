import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { CreateAttendanceBatchDto } from './dto/create-attendance-batch.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@ApiTags('Attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos os registros de presença' })
  @ApiResponse({ status: 200, description: 'Lista de presenças retornada com sucesso.' })
  findAll() {
    return this.attendanceService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar registro de presença por ID' })
  @ApiParam({ name: 'id', description: 'ID do registro' })
  @ApiResponse({ status: 200, description: 'Registro retornado com sucesso.' })
  findOne(@Param('id') id: string) {
    return this.attendanceService.findOne(Number(id));
  }

  @Post()
  @ApiOperation({ summary: 'Criar novo registro de presença' })
  @ApiBody({ type: CreateAttendanceDto })
  @ApiResponse({ status: 201, description: 'Registro criado com sucesso.' })
  create(@Body() createAttendanceDto: CreateAttendanceDto) {
    return this.attendanceService.create(createAttendanceDto);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Registrar presença de toda a turma em uma única operação' })
  @ApiBody({ type: CreateAttendanceBatchDto })
  @ApiResponse({ status: 201, description: 'Presenças registradas com sucesso.' })
  @ApiResponse({ status: 404, description: 'Turma não encontrada.' })
  @ApiResponse({ status: 409, description: 'Algum aluno já possui presença registrada para esta turma e data.' })
  createBatch(@Body() createAttendanceBatchDto: CreateAttendanceBatchDto) {
    return this.attendanceService.createBatch(createAttendanceBatchDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar registro de presença' })
  @ApiParam({ name: 'id', description: 'ID do registro' })
  @ApiBody({ type: UpdateAttendanceDto })
  @ApiResponse({ status: 200, description: 'Registro atualizado com sucesso.' })
  update(@Param('id') id: string, @Body() updateAttendanceDto: UpdateAttendanceDto) {
    return this.attendanceService.update(Number(id), updateAttendanceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover registro de presença' })
  @ApiParam({ name: 'id', description: 'ID do registro' })
  @ApiResponse({ status: 200, description: 'Registro removido com sucesso.' })
  remove(@Param('id') id: string) {
    return this.attendanceService.remove(Number(id));
  }
}
