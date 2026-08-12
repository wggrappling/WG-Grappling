import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethod } from '../../../generated/prisma/enums';

export class CreatePaymentDto {
  @ApiProperty({ example: 100 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.PIX })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ example: '2026-08-12T00:00:00.000Z' })
  @IsDateString()
  paidAt: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reference?: string;
}
