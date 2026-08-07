import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateResponsibleDto {
  @ApiProperty({ example: 'Maria da Silva', description: 'Nome do responsável' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '12345678901', description: 'CPF do responsável' })
  @IsString()
  @IsNotEmpty()
  cpf: string;

  @ApiProperty({ example: 'maria@email.com', description: 'E-mail do responsável', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '(11) 99999-9999', description: 'Telefone do responsável', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Mãe', description: 'Relacionamento com o aluno' })
  @IsString()
  @IsNotEmpty()
  relationship: string;
}
