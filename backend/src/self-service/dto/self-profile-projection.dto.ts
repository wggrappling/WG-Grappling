import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StudentStatus } from '../../../generated/prisma/enums';

export class SelfProfileProjectionDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiPropertyOptional({ nullable: true }) phone: string | null;
  @ApiProperty() enrollmentNumber: string;
  @ApiProperty({ enum: StudentStatus }) studentStatus: StudentStatus;
  @ApiProperty() joinedAt: Date;
}
