import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { StudentStatus } from '../../../generated/prisma/enums';

export class StudentQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(StudentStatus) status?: StudentStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) modalityId?: number;
  @IsOptional() @IsIn(['name', 'enrollmentNumber', 'status', 'joinedAt']) sortBy = 'name';
  @IsOptional() @IsIn(['asc', 'desc']) sortOrder: 'asc' | 'desc' = 'asc';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
}
