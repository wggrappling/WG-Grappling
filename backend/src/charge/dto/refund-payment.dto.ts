import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RefundPaymentDto {
  @ApiProperty({ example: 'Pagamento lançado na cobrança incorreta' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  @Matches(/\S/, { message: 'Motivo do estorno é obrigatório.' })
  reason: string;
}
