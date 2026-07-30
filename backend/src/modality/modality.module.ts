import { Module } from '@nestjs/common';
import { ModalityController } from './modality.controller';
import { ModalityService } from './modality.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ModalityController],
  providers: [ModalityService],
})
export class ModalityModule {}
