import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DocumentStatus, DocumentType, UserRole } from '../../generated/prisma/enums';
import { DocumentsService } from './documents.service';

describe('DocumentsService files', () => {
  const prisma = { student: { findUnique: jest.fn() }, document: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() } };
  const storage = { save: jest.fn(), get: jest.fn(), delete: jest.fn(), exists: jest.fn() };
  const service = new DocumentsService(prisma as never, storage as never);
  const user = { id: 5, role: UserRole.RECEPTION };
  const pdf = { buffer: Buffer.from('%PDF-1.7 document'), originalname: 'contrato.pdf', mimetype: 'application/pdf', size: 17 };
  const document = { id: 1, studentId: 2, type: DocumentType.CONTRACT, fileName: 'safe.pdf', storagePath: 'safe.pdf', originalName: 'contrato.pdf', mimeType: 'application/pdf', extension: 'pdf', size: 17, status: DocumentStatus.ACTIVE, uploadedBy: 5, createdAt: new Date(), updatedAt: new Date() };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.student.findUnique.mockResolvedValue({ id: 2 });
    prisma.document.create.mockResolvedValue(document);
    prisma.document.findUnique.mockResolvedValue(document);
    prisma.document.update.mockResolvedValue({ ...document, status: DocumentStatus.DELETED });
    storage.exists.mockResolvedValue(true);
    storage.get.mockResolvedValue(pdf.buffer);
  });

  it('faz upload válido', async () => {
    const result = await service.upload(2, DocumentType.CONTRACT, pdf, user);
    expect(storage.save).toHaveBeenCalledWith(expect.stringMatching(/\.pdf$/), pdf.buffer);
    expect(result.data).not.toHaveProperty('storagePath');
  });
  it('rejeita aluno inexistente', async () => { prisma.student.findUnique.mockResolvedValue(null); await expect(service.upload(9, DocumentType.CONTRACT, pdf, user)).rejects.toBeInstanceOf(NotFoundException); });
  it('rejeita tipo inválido', async () => { await expect(service.upload(2, 'INVALID' as DocumentType, pdf, user)).rejects.toBeInstanceOf(BadRequestException); });
  it('rejeita arquivo acima do limite', async () => { const previous = process.env.DOCUMENT_MAX_SIZE_MB; process.env.DOCUMENT_MAX_SIZE_MB = '0.000001'; await expect(service.upload(2, DocumentType.CONTRACT, pdf, user)).rejects.toBeInstanceOf(BadRequestException); process.env.DOCUMENT_MAX_SIZE_MB = previous; });
  it('rejeita MIME ou assinatura inválida', async () => { await expect(service.upload(2, DocumentType.CONTRACT, { ...pdf, mimetype: 'application/x-msdownload' }, user)).rejects.toBeInstanceOf(BadRequestException); });
  it('permite download autorizado', async () => { const result = await service.getFile(1, user); expect(result.data).toEqual(pdf.buffer); });
  it('rejeita download não autorizado', async () => { await expect(service.getFile(1, { id: 7, role: UserRole.TEACHER })).rejects.toBeInstanceOf(ForbiddenException); });
  it('rejeita documento inexistente', async () => { prisma.document.findUnique.mockResolvedValue(null); await expect(service.getFile(999, user)).rejects.toBeInstanceOf(NotFoundException); });
  it('remove arquivo e faz soft delete quando autorizado', async () => { await service.remove(1, user); expect(storage.delete).toHaveBeenCalledWith('safe.pdf'); expect(prisma.document.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { status: DocumentStatus.DELETED } }); });
  it('rejeita remoção não autorizada', async () => { await expect(service.remove(1, { id: 7, role: UserRole.TEACHER })).rejects.toBeInstanceOf(ForbiddenException); });
  it('remove arquivo salvo quando o banco falha no upload', async () => { prisma.document.create.mockRejectedValue(new Error('db')); await expect(service.upload(2, DocumentType.CONTRACT, pdf, user)).rejects.toThrow('db'); expect(storage.delete).toHaveBeenCalled(); });
  it('rejeita download quando arquivo não existe no storage', async () => { storage.exists.mockResolvedValue(false); await expect(service.getFile(1, user)).rejects.toBeInstanceOf(NotFoundException); });
});
