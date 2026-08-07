import { Module } from '@nestjs/common';
import { ResponsibleService } from './responsible.service';
import { ResponsibleController } from './responsible.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ResponsibleController],
  providers: [ResponsibleService],
})
export class ResponsibleModule {}
