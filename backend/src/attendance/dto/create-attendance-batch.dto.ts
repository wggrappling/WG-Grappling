import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, ArrayUnique, IsArray, IsDateString, IsEnum, IsInt, Min, ValidateNested } from 'class-validator';
import { AttendanceStatus } from '../../../generated/prisma/enums';

class AttendanceStudentInputDto {
  @ApiProperty({ example: 1, description: 'ID do estudante' })
  @IsInt()
  @Min(1)
  studentId: number;

  @ApiProperty({ enum: AttendanceStatus, example: AttendanceStatus.PRESENT })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;
}

export class CreateAttendanceBatchDto {
  @ApiProperty({ example: 1, description: 'ID da turma' })
  @IsInt()
  @Min(1)
  classId: number;

  @ApiProperty({ example: '2026-07-30T10:00:00.000Z', description: 'Data da presença' })
  @IsDateString()
  attendanceDate: string;

  @ApiProperty({ type: [AttendanceStudentInputDto], description: 'Lista de estudantes e status da presença' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((student: AttendanceStudentInputDto) => student.studentId)
  @ValidateNested({ each: true })
  @Type(() => AttendanceStudentInputDto)
  students: AttendanceStudentInputDto[];
}
