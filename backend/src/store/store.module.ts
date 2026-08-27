import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DocumentsModule } from '../documents/documents.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';

@Module({ imports: [PrismaModule, AuditModule, DocumentsModule], controllers: [StoreController], providers: [StoreService], exports: [StoreService] })
export class StoreModule {}
