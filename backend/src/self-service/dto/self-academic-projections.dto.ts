import { ApiProperty } from '@nestjs/swagger';

export class SelfGraduationsProjectionDto {
  @ApiProperty({ isArray: true }) current: unknown[];
  @ApiProperty({ isArray: true }) history: unknown[];
}

export class SelfModalitiesProjectionDto {
  @ApiProperty({ isArray: true }) current: unknown[];
  @ApiProperty({ isArray: true }) history: unknown[];
}

export class SelfAttendanceProjectionDto {
  @ApiProperty() period: { startDate: string; endDate: string };
  @ApiProperty() summary: {
    total: number;
    present: number;
    absent: number;
    justified: number;
  };
  @ApiProperty({ isArray: true }) records: unknown[];
}

export class SelfFinanceProjectionDto {
  @ApiProperty() plans: { current: unknown[]; history: unknown[] };
  @ApiProperty({ isArray: true }) charges: unknown[];
  @ApiProperty({ isArray: true }) payments: unknown[];
  @ApiProperty() situation: Record<string, unknown>;
}
