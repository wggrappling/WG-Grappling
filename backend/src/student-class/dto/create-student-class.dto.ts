import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class CreateStudentClassDto {
  @ApiProperty({ example: 1, description: 'ID do estudante' })
  @IsInt()
  @Min(1)
  studentId: number;

  @ApiProperty({ example: 1, description: 'ID da turma' })
  @IsInt()
  @Min(1)
  classId: number;
}
