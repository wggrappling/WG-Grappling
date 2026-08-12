import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class AttendanceQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) studentId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) classId?: number;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
}
