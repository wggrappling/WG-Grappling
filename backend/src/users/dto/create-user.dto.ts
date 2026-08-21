import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { IsPasswordPolicy } from '../../auth/password-policy';

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  RECEPTION = 'RECEPTION',
  TEACHER = 'TEACHER',
}

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @Length(3, 100, {
    message: 'O nome deve ter entre 3 e 100 caracteres.',
  })
  name: string;

  @IsEmail({}, {
    message: 'Informe um e-mail válido.',
  })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  @IsPasswordPolicy()
  password: string;

  @IsEnum(UserRole, {
    message: 'O cargo deve ser OWNER, ADMIN, RECEPTION ou TEACHER.',
  })
  role: UserRole;

  @IsOptional()
  @IsBoolean({ message: 'O campo active deve ser verdadeiro ou falso.' })
  active?: boolean;
}
