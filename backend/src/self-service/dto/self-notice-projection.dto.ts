import { ApiProperty } from '@nestjs/swagger';

export class SelfNoticeProjectionDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  publishedAt: Date;

  @ApiProperty()
  isRead: boolean;
}
