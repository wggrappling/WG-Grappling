import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';
import { ChargeStatus, ChargeType } from '../../../generated/prisma/enums';

export class CreateChargeDto {
  @ApiProperty({ example: 1, description: 'ID do estudante' })
  @IsInt()
  @Min(1)
  studentId: number;

  @ApiProperty({ example: 1, description: 'ID do plano associado, quando houver', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  planId?: number;

  @ApiProperty({ enum: ChargeType, example: ChargeType.MONTHLY_FEE })
  @IsEnum(ChargeType)
  type: ChargeType;

  @ApiProperty({ example: 'Mensalidade de julho', description: 'Descrição da cobrança' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 150, description: 'Valor original da cobrança' })
  @IsNumber()
  @Min(0)
  originalAmount: number;

  @ApiProperty({ example: 0, description: 'Valor de desconto aplicado', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiProperty({ example: 150, description: 'Valor final da cobrança' })
  @IsNumber()
  @Min(0)
  finalAmount: number;

  @ApiProperty({ example: '2026-08-10T00:00:00.000Z', description: 'Data de vencimento' })
  @IsDateString()
  dueDate: string;

  @ApiProperty({ example: '2026-08', description: 'Competência da cobrança no formato YYYY-MM' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'referenceMonth deve estar no formato YYYY-MM' })
  referenceMonth: string;

  @ApiProperty({ enum: ChargeStatus, example: ChargeStatus.PENDING, required: false })
  @IsOptional()
  @IsEnum(ChargeStatus)
  status?: ChargeStatus;
}
