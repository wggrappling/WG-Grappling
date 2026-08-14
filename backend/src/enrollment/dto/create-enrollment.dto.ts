import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { StudentStatus } from '../../../generated/prisma/enums';
import { CreatePersonDto } from '../../people/dto/create-person.dto';
import { CreateResponsibleDto } from '../../responsible/dto/create-responsible.dto';

export class EnrollmentAddressDto {
  @IsString() @IsNotEmpty() street: string;
  @IsOptional() @IsString() number?: string;
  @IsOptional() @IsString() complement?: string;
  @IsString() @IsNotEmpty() neighborhood: string;
  @IsString() @IsNotEmpty() city: string;
  @IsString() @Length(2, 2) state: string;
  @IsString() @IsNotEmpty() zipCode: string;
  @IsOptional() @IsString() country?: string;
}

export class EnrollmentStudentDto {
  @ApiProperty({ example: '2026-001', required: false, description: 'Gerado automaticamente quando omitido' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  enrollmentNumber?: string;

  @ApiProperty({ enum: StudentStatus, required: false, default: StudentStatus.ACTIVE })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @ApiProperty({ example: '2026-08-12T00:00:00.000Z', required: false, description: 'Usa startDate quando omitida' })
  @IsOptional()
  @IsDateString()
  joinedAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateEnrollmentDto {
  @ApiProperty({ example: 1, description: 'ID do estudante existente', required: false })
  @ValidateIf((dto: CreateEnrollmentDto) => dto.person === undefined && dto.student === undefined)
  @IsInt()
  @Min(1)
  studentId?: number;

  @ApiProperty({ type: CreatePersonDto, required: false })
  @ValidateIf((dto: CreateEnrollmentDto) => dto.studentId === undefined)
  @ValidateNested()
  @Type(() => CreatePersonDto)
  person?: CreatePersonDto;

  @ApiProperty({ type: EnrollmentStudentDto, required: false })
  @ValidateIf((dto: CreateEnrollmentDto) => dto.studentId === undefined)
  @ValidateNested()
  @Type(() => EnrollmentStudentDto)
  student?: EnrollmentStudentDto;

  @ApiProperty({ type: EnrollmentAddressDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => EnrollmentAddressDto)
  address?: EnrollmentAddressDto;

  @ApiProperty({ type: CreateResponsibleDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateResponsibleDto)
  responsible?: CreateResponsibleDto;

  @ApiProperty({ example: 1, description: 'ID do plano' })
  @IsInt()
  @Min(1)
  planId: number;

  @ApiProperty({ example: 129.9, description: 'Preço mensal do plano' })
  @IsNumber()
  @Min(0)
  monthlyPrice: number;

  @ApiProperty({ example: 10, description: 'Dia do mês para cobrança' })
  @IsInt()
  @Min(1)
  @Max(31)
  billingDay: number;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z', description: 'Data de início da matrícula' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: [1], required: false })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  modalityIds?: number[];

  @ApiProperty({ example: [1], required: false })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  classIds?: number[];
}
