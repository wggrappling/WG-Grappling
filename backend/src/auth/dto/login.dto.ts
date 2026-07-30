import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'usuario@wg.com', description: 'E-mail do usuário' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;

  @ApiProperty({ example: 'SenhaForte123', description: 'Senha do usuário' })
  @IsString()
  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  password: string;
}
