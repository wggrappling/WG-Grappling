import { ApiProperty } from '@nestjs/swagger';
import { DocumentStatus, DocumentType } from '../../../generated/prisma/enums';

export class SelfDocumentProjectionDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: DocumentType })
  type: DocumentType;

  @ApiProperty({ enum: DocumentStatus })
  status: DocumentStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  size: number;

  @ApiProperty()
  available: boolean;
}
