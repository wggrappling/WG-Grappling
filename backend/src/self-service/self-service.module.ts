import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StudentContextGuard } from './context/student-context.guard';
import { StudentContextResolver } from './context/student-context.resolver';
import { StudentAccessPolicy } from './context/student-access.policy';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { SelfAcademicService } from './self-academic.service';
import { SelfStoreService } from './self-store.service';
import { StoreModule } from '../store/store.module';

@Module({
  imports: [PrismaModule, StoreModule],
  controllers: [MeController],
  providers: [
    MeService,
    SelfAcademicService,
    SelfStoreService,
    StudentAccessPolicy,
    StudentContextResolver,
    StudentContextGuard,
  ],
})
export class SelfServiceModule {}
