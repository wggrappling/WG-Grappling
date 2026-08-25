import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { BeltRank } from '../../../generated/prisma/enums';

export class CreateGraduationDto {
  @IsInt() @Min(1) modalityId: number;
  @IsOptional() @IsInt() @Min(1) graduationLevelId?: number;
  /** Compatibilidade temporária: o código precisa existir no catálogo da modalidade. */
  @IsOptional() @IsEnum(BeltRank) belt?: BeltRank;
  @IsOptional() @IsInt() @Min(0) degree?: number;
  @IsDateString() beltStartedAt: string;
  @IsDateString() graduatedAt: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateGraduationDto {
  @IsOptional() @IsInt() @Min(1) graduationLevelId?: number;
  @IsOptional() @IsInt() @Min(0) degree?: number;
  @IsOptional() @IsEnum(BeltRank) belt?: BeltRank;
  @IsOptional() @IsDateString() beltStartedAt?: string;
  @IsOptional() @IsDateString() graduatedAt?: string;
  @IsOptional() @IsString() notes?: string;
  @IsString() @MinLength(3) correctionReason: string;
}

export class CancelGraduationDto {
  @IsString() @MinLength(3) reason: string;
}
