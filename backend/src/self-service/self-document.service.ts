import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus } from '../../generated/prisma/enums';
import { StorageService } from '../documents/storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUserContext } from './context/authenticated-user-context';
import type { SelfDocumentProjectionDto } from './dto/self-document-projection.dto';

const documentSelect = {
  id: true,
  studentId: true,
  type: true,
  originalName: true,
  mimeType: true,
  size: true,
  storagePath: true,
  status: true,
  createdAt: true,
} as const;

type SelfDocumentRecord = {
  id: number;
  studentId: number;
  type: SelfDocumentProjectionDto['type'];
  originalName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  status: DocumentStatus;
  createdAt: Date;
};

@Injectable()
export class SelfDocumentService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  async getDocuments(context: AuthenticatedUserContext): Promise<SelfDocumentProjectionDto[]> {
    const documents = await this.prisma.document.findMany({
      where: { studentId: context.studentId, status: { not: DocumentStatus.DELETED } },
      select: documentSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
    return Promise.all(documents.map((document) => this.project(document)));
  }

  async getDocument(context: AuthenticatedUserContext, documentId: number): Promise<SelfDocumentProjectionDto> {
    const document = await this.findOwned(context.studentId, documentId);
    if (!document) throw new NotFoundException('Documento não encontrado.');
    return this.project(document);
  }

  async getFile(context: AuthenticatedUserContext, documentId: number) {
    const document = await this.findOwned(context.studentId, documentId);
    if (!document) throw new NotFoundException('Documento não encontrado.');
    if (document.status !== DocumentStatus.ACTIVE || !await this.storage.exists(document.storagePath)) {
      throw new NotFoundException('Arquivo do documento não está disponível.');
    }
    return {
      data: await this.storage.get(document.storagePath),
      mimeType: document.mimeType,
      name: document.originalName,
      inline: document.mimeType === 'application/pdf' || document.mimeType.startsWith('image/'),
    };
  }

  private findOwned(studentId: number, documentId: number) {
    return this.prisma.document.findFirst({
      where: { id: documentId, studentId, status: { not: DocumentStatus.DELETED } },
      select: documentSelect,
    });
  }

  private async project(document: SelfDocumentRecord): Promise<SelfDocumentProjectionDto> {
    const available = document.status === DocumentStatus.ACTIVE && await this.storage.exists(document.storagePath);
    return { id: document.id, name: document.originalName, type: document.type, status: document.status, createdAt: document.createdAt, size: document.size, available };
  }
}
