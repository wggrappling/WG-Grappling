import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min, Matches } from 'class-validator';

export class CreateClassDto {
  @ApiProperty({ example: 'Turma Manhã', description: 'Nome da turma' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 1, description: 'ID da modalidade' })
  @IsInt()
  @Min(1)
  modalityId: number;

  @ApiProperty({ example: 2, description: 'ID do professor (usuário com role TEACHER)' })
  @IsInt()
  @Min(1)
  teacherUserId: number;

  @ApiProperty({ example: ['MONDAY', 'WEDNESDAY', 'FRIDAY'], description: 'Dias da semana da turma' })
  @IsArray()
  @IsString({ each: true })
  weekDays: string[];

  @ApiProperty({ example: '08:00', description: 'Horário de início da turma' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTime: string;

  @ApiProperty({ example: '09:30', description: 'Horário de término da turma' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  endTime: string;

  @ApiProperty({ example: 20, description: 'Capacidade da turma' })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiProperty({ example: true, description: 'Indica se a turma está ativa', required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
