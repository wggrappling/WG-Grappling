import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class SelfAttendanceQueryDto {
  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @Matches(ISO_DATE, { message: 'startDate deve usar o formato YYYY-MM-DD.' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-03-31' })
  @IsOptional()
  @Matches(ISO_DATE, { message: 'endDate deve usar o formato YYYY-MM-DD.' })
  endDate?: string;
}
