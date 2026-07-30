import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { StudentModalityStatus } from '../../../generated/prisma/enums';

export class CreateStudentModalityDto {
  @ApiProperty({ example: 1, description: 'ID do estudante' })
  @IsInt()
  studentId: number;

  @ApiProperty({ example: 1, description: 'ID da modalidade' })
  @IsInt()
  modalityId: number;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z', description: 'Data de início da associação' })
  @IsDateString()
  startedAt: string;

  @ApiProperty({ enum: StudentModalityStatus, example: StudentModalityStatus.ACTIVE })
  @IsEnum(StudentModalityStatus)
  status: StudentModalityStatus;

  @ApiProperty({ example: 'Observações sobre o vínculo', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
