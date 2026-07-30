import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ example: 'Plano Mensal', description: 'Nome do plano' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Acesso ilimitado às aulas da semana', description: 'Descrição do plano' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 129.9, description: 'Preço do plano' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 4, description: 'Quantidade de aulas semanais' })
  @IsNumber()
  @Min(0)
  weeklyClasses: number;

  @ApiProperty({ example: true, description: 'Indica se o plano está ativo', required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
