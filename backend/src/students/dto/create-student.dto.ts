import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsDateString, IsInt } from 'class-validator';
import { StudentStatus } from '../../../generated/prisma/enums';

export class CreateStudentDto {
  @ApiProperty({ example: 1, description: 'ID da pessoa associada ao estudante' })
  @IsInt()
  personId: number;

  @ApiProperty({ example: '2024-001', description: 'Número de matrícula único' })
  @IsString()
  @IsNotEmpty()
  enrollmentNumber: string;

  @ApiProperty({ enum: StudentStatus, example: StudentStatus.ACTIVE })
  @IsEnum(StudentStatus)
  status: StudentStatus;

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z', description: 'Data de entrada' })
  @IsDateString()
  joinedAt: string;

  @ApiProperty({ example: 'Observações sobre o estudante', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
