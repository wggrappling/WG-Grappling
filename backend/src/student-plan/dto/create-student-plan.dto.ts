import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { StudentPlanStatus } from '../../../generated/prisma/enums';

export class CreateStudentPlanDto {
  @ApiProperty({ example: 1, description: 'ID do estudante' })
  @IsInt()
  studentId: number;

  @ApiProperty({ example: 1, description: 'ID do plano' })
  @IsInt()
  planId: number;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z', description: 'Data de início do plano' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-12-31T00:00:00.000Z', description: 'Data de término do plano', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ example: 129.9, description: 'Preço mensal do plano' })
  @IsNumber()
  @Min(0)
  monthlyPrice: number;

  @ApiProperty({ example: 10, description: 'Dia de cobrança do plano' })
  @IsInt()
  @Min(1)
  @Max(31)
  billingDay: number;

  @ApiProperty({ enum: StudentPlanStatus, example: StudentPlanStatus.ACTIVE })
  @IsEnum(StudentPlanStatus)
  status: StudentPlanStatus;

  @ApiProperty({ example: 'Observações sobre o vínculo do aluno com o plano', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
