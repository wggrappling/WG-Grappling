import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StudentStatus } from '../../../generated/prisma/enums';

export class SelfProfileProjectionDto {
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiPropertyOptional({ nullable: true }) phone: string | null;
  @ApiProperty() maskedCpf: string;
  @ApiPropertyOptional({ nullable: true, type: () => SelfProfileAddressProjectionDto })
  address: SelfProfileAddressProjectionDto | null;
  @ApiProperty() enrollmentNumber: string;
  @ApiProperty({ enum: StudentStatus }) studentStatus: StudentStatus;
  @ApiProperty() joinedAt: Date;
}

export class SelfProfileAddressProjectionDto {
  @ApiProperty() zipCode: string;
  @ApiProperty() street: string;
  @ApiPropertyOptional({ nullable: true }) number: string | null;
  @ApiPropertyOptional({ nullable: true }) complement: string | null;
  @ApiProperty() neighborhood: string;
  @ApiProperty() city: string;
  @ApiProperty() state: string;
  @ApiProperty() country: string;
}
