import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { AttendanceStatus } from '../../../generated/prisma/enums';

export class CreateAttendanceDto {
  @ApiProperty({ example: 1, description: 'ID da turma' })
  @IsInt()
  @Min(1)
  classId: number;

  @ApiProperty({ example: 1, description: 'ID do estudante' })
  @IsInt()
  @Min(1)
  studentId: number;

  @ApiProperty({ example: '2026-07-30T10:00:00.000Z', description: 'Data da presença' })
  @IsDateString()
  attendanceDate: string;

  @ApiProperty({ enum: AttendanceStatus, example: AttendanceStatus.PRESENT })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiProperty({ example: 'Aluno chegou atrasado', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
