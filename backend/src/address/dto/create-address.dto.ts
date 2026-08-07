import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ example: 1, description: 'ID da pessoa vinculada ao endereço' })
  @IsInt()
  @IsNotEmpty()
  personId: number;

  @ApiProperty({ example: 'Rua das Flores', description: 'Logradouro' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ example: '123', description: 'Número do endereço', required: false })
  @IsOptional()
  @IsString()
  number?: string;

  @ApiProperty({ example: 'Apto 3', description: 'Complemento do endereço', required: false })
  @IsOptional()
  @IsString()
  complement?: string;

  @ApiProperty({ example: 'Centro', description: 'Bairro' })
  @IsString()
  @IsNotEmpty()
  neighborhood: string;

  @ApiProperty({ example: 'São Paulo', description: 'Cidade' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'SP', description: 'Estado' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  state: string;

  @ApiProperty({ example: '01000-000', description: 'CEP' })
  @IsString()
  @IsNotEmpty()
  zipCode: string;

  @ApiProperty({ example: 'Brasil', description: 'País', required: false })
  @IsOptional()
  @IsString()
  country?: string;
}
