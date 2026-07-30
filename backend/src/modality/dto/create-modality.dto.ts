import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateModalityDto {
  @ApiProperty({ example: 'Jiu-Jitsu', description: 'Nome da modalidade' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Modalidade de luta com foco em chão', description: 'Descrição da modalidade' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: true, description: 'Indica se a modalidade possui graduação' })
  @IsBoolean()
  hasGraduation: boolean;

  @ApiProperty({ example: true, description: 'Indica se a modalidade está ativa', required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
