import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AttendanceStatus, BeltRank, ChargeStatus, StudentStatus } from '../../../generated/prisma/enums';

export class PaginationDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
}

export class StudentReportQueryDto extends PaginationDto {
  @IsOptional() @IsEnum(StudentStatus) status?: StudentStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) modalityId?: number;
  @IsOptional() @IsDateString() joinedFrom?: string;
  @IsOptional() @IsDateString() joinedTo?: string;
}

export class FinancialReportQueryDto extends PaginationDto {
  @IsOptional() @IsEnum(ChargeStatus) status?: ChargeStatus;
  @IsOptional() @IsDateString() dueFrom?: string;
  @IsOptional() @IsDateString() dueTo?: string;
}

export class AttendanceReportQueryDto extends PaginationDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) classId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) studentId?: number;
  @IsOptional() @IsString() studentName?: string;
  @IsOptional() @IsEnum(AttendanceStatus) status?: AttendanceStatus;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
}

export class GraduationReportQueryDto extends PaginationDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) modalityId?: number;
  @IsOptional() @IsEnum(BeltRank) belt?: BeltRank;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
}
