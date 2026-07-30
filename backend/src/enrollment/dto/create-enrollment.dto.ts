import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateEnrollmentDto {
  @ApiProperty({ example: 1, description: 'ID do estudante' })
  @IsInt()
  @Min(1)
  studentId: number;

  @ApiProperty({ example: 1, description: 'ID do plano' })
  @IsInt()
  @Min(1)
  planId: number;

  @ApiProperty({ example: 129.9, description: 'Preço mensal do plano' })
  @IsNumber()
  @Min(0)
  monthlyPrice: number;

  @ApiProperty({ example: 10, description: 'Dia do mês para cobrança' })
  @IsInt()
  @Min(1)
  billingDay: number;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z', description: 'Data de início da matrícula' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: [1, 2], description: 'IDs das modalidades a associar', required: false })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  modalityIds?: number[];

  @ApiProperty({ example: [1, 2], description: 'IDs das turmas a associar', required: false })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  classIds?: number[];
}
