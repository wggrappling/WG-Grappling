import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreatePersonDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @Length(3, 100, {
    message: 'O nome deve ter entre 3 e 100 caracteres.',
  })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'O CPF é obrigatório.' })
  @Length(11, 11, {
    message: 'O CPF deve conter exatamente 11 números.',
  })
  cpf: string;

  @IsEmail({}, {
    message: 'Informe um e-mail válido.',
  })
  email: string;

  @IsOptional()
  @IsString()
  @Length(10, 20, {
    message: 'O telefone deve ter entre 10 e 20 caracteres.',
  })
  phone?: string;
}