import { NotFoundException } from '@nestjs/common';
import { DocumentStatus, DocumentType, StudentStatus, UserRole } from '../../generated/prisma/enums';
import { StorageService } from '../documents/storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { SelfServiceCapability } from './context/student-access.policy';
import { SelfDocumentService } from './self-document.service';

describe('SelfDocumentService', () => {
  const prisma = { document: { findMany: jest.fn(), findFirst: jest.fn() } };
  const storage = { exists: jest.fn(), get: jest.fn() };
  const service = new SelfDocumentService(prisma as unknown as PrismaService, storage as unknown as StorageService);
  const context = {
    userId: 7, role: UserRole.ALUNO, studentId: 41, studentStatus: StudentStatus.ACTIVE,
    capabilities: [SelfServiceCapability.READ, SelfServiceCapability.OPERATE],
  } as const;
  const document = {
    id: 3, studentId: 41, type: DocumentType.CONTRACT, originalName: 'contrato.pdf', mimeType: 'application/pdf',
    size: 1200, storagePath: 'private-key.pdf', status: DocumentStatus.ACTIVE, createdAt: new Date('2026-08-20T12:00:00Z'),
  };

  beforeEach(() => { jest.clearAllMocks(); storage.exists.mockResolvedValue(true); storage.get.mockResolvedValue(Buffer.from('%PDF')); });

  it('lists only authenticated student non-deleted documents with a closed projection', async () => {
    prisma.document.findMany.mockResolvedValue([{ ...document, uploadedBy: 99, internal: 'hidden' }]);
    await expect(service.getDocuments(context)).resolves.toEqual([{
      id: 3, name: 'contrato.pdf', type: DocumentType.CONTRACT, status: DocumentStatus.ACTIVE,
      createdAt: new Date('2026-08-20T12:00:00Z'), size: 1200, available: true,
    }]);
    expect(prisma.document.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId: 41, status: { not: DocumentStatus.DELETED } }, take: 100,
    }));
    expect(prisma.document.findMany.mock.calls[0][0].select).not.toHaveProperty('uploadedBy');
  });

  it('blocks detail IDOR through an ownership-filtered query', async () => {
    prisma.document.findFirst.mockResolvedValue(null);
    await expect(service.getDocument(context, 500)).rejects.toThrow(NotFoundException);
    expect(prisma.document.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 500, studentId: 41, status: { not: DocumentStatus.DELETED } },
    }));
  });

  it('downloads an owned available file without exposing its storage key', async () => {
    prisma.document.findFirst.mockResolvedValue(document);
    const result = await service.getFile(context, 3);
    expect(result).toEqual({ data: Buffer.from('%PDF'), mimeType: 'application/pdf', name: 'contrato.pdf', inline: true });
    expect(storage.get).toHaveBeenCalledWith('private-key.pdf');
    expect(result).not.toHaveProperty('storagePath');
  });

  it('rejects another student document before reading storage', async () => {
    prisma.document.findFirst.mockResolvedValue(null);
    await expect(service.getFile(context, 88)).rejects.toThrow(NotFoundException);
    expect(storage.exists).not.toHaveBeenCalled();
    expect(storage.get).not.toHaveBeenCalled();
  });

  it('rejects archived and missing files', async () => {
    prisma.document.findFirst.mockResolvedValue({ ...document, status: DocumentStatus.ARCHIVED });
    await expect(service.getFile(context, 3)).rejects.toThrow(NotFoundException);
    prisma.document.findFirst.mockResolvedValue(document);
    storage.exists.mockResolvedValue(false);
    await expect(service.getFile(context, 3)).rejects.toThrow(NotFoundException);
    expect(storage.get).not.toHaveBeenCalled();
  });

  it('allows PAUSED to consult without adding upload capability', async () => {
    const paused = { ...context, studentStatus: StudentStatus.PAUSED, capabilities: [SelfServiceCapability.READ] } as const;
    prisma.document.findMany.mockResolvedValue([]);
    await expect(service.getDocuments(paused)).resolves.toEqual([]);
    expect(service).not.toHaveProperty('upload');
  });
});
