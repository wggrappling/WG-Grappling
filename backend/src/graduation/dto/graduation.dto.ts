import { IsDateString,IsEnum,IsInt,IsOptional,IsString,Min } from 'class-validator'; import { BeltRank } from '../../../generated/prisma/enums';
export class CreateGraduationDto{@IsInt()@Min(1)modalityId:number;@IsEnum(BeltRank)belt:BeltRank;@IsDateString()beltStartedAt:string;@IsDateString()graduatedAt:string;@IsOptional()@IsString()notes?:string}
export class UpdateGraduationDto{@IsOptional()@IsEnum(BeltRank)belt?:BeltRank;@IsOptional()@IsDateString()beltStartedAt?:string;@IsOptional()@IsDateString()graduatedAt?:string;@IsOptional()@IsString()notes?:string}
