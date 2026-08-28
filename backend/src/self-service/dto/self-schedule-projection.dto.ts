import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SelfScheduleClassProjectionDto {
  @ApiProperty() date: string;
  @ApiProperty() startTime: string;
  @ApiProperty() endTime: string;
  @ApiProperty() className: string;
  @ApiProperty() modalityName: string;
}

export class SelfScheduleProjectionDto {
  @ApiPropertyOptional({ nullable: true, type: SelfScheduleClassProjectionDto })
  next: SelfScheduleClassProjectionDto | null;

  @ApiProperty({ type: SelfScheduleClassProjectionDto, isArray: true })
  upcoming: SelfScheduleClassProjectionDto[];
}
