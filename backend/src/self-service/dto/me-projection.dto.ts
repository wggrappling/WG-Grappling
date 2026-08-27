import { ApiProperty } from '@nestjs/swagger';
import { StudentStatus, UserRole } from '../../../generated/prisma/enums';

class MeAccountProjectionDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiProperty({ enum: UserRole }) role: UserRole;
  @ApiProperty() active: boolean;
}

class MeStudentProjectionDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
  @ApiProperty() enrollmentNumber: string;
  @ApiProperty({ enum: StudentStatus }) status: StudentStatus;
  @ApiProperty() joinedAt: Date;
}

class AcademicContextProjectionDto {
  @ApiProperty() active: boolean;
}

export class MeProjectionDto {
  @ApiProperty({ type: MeAccountProjectionDto }) account: MeAccountProjectionDto;
  @ApiProperty({ type: MeStudentProjectionDto }) student: MeStudentProjectionDto;
  @ApiProperty({ type: AcademicContextProjectionDto }) academicContext: AcademicContextProjectionDto;
}
