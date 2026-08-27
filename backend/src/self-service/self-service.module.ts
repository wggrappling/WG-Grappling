import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StudentContextGuard } from './context/student-context.guard';
import { StudentContextResolver } from './context/student-context.resolver';
import { MeController } from './me.controller';
import { MeService } from './me.service';

@Module({
  imports: [PrismaModule],
  controllers: [MeController],
  providers: [MeService, StudentContextResolver, StudentContextGuard],
})
export class SelfServiceModule {}
