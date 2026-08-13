import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEmail, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { StudentStatus } from '../../../generated/prisma/enums';

class MaintainPersonDto {
  @IsString() name: string;
  @IsString() cpf: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() phone?: string;
}
class MaintainStudentDto {
  @IsEnum(StudentStatus) status: StudentStatus;
  @IsDateString() joinedAt: string;
  @IsOptional() @IsString() notes?: string;
}
class MaintainPlanDto {
  @IsInt() @Min(1) planId: number;
  @IsNumber() @Min(0) monthlyPrice: number;
  @IsInt() @Min(1) @Max(31) billingDay: number;
  @IsDateString() startDate: string;
}
export class MaintainEnrollmentDto {
  @IsOptional() @ValidateNested() @Type(() => MaintainPersonDto) person?: MaintainPersonDto;
  @IsOptional() @ValidateNested() @Type(() => MaintainStudentDto) student?: MaintainStudentDto;
  @IsOptional() @ValidateNested() @Type(() => MaintainPlanDto) plan?: MaintainPlanDto;
  @IsOptional() @IsArray() @IsInt({ each: true }) addModalityIds?: number[];
  @IsOptional() @IsArray() @IsInt({ each: true }) deactivateStudentModalityIds?: number[];
  @IsOptional() @IsArray() @IsInt({ each: true }) addClassIds?: number[];
  @IsOptional() @IsArray() @IsInt({ each: true }) removeStudentClassIds?: number[];
}
