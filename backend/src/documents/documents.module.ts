import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { LocalStorageAdapter } from './storage/local-storage.adapter';
import { StorageService } from './storage/storage.service';

@Module({
  imports: [PrismaModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, LocalStorageAdapter, { provide: StorageService, useExisting: LocalStorageAdapter }],
  exports: [StorageService],
})
export class DocumentsModule {}
