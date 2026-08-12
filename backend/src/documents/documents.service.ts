import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { DocumentStatus, DocumentType, UserRole } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { StorageService } from './storage/storage.service';

export type UploadedDocumentFile = { buffer: Buffer; originalname: string; mimetype: string; size: number } | undefined;
type UserContext = { id: number; role: UserRole };
const allowedRoles = new Set<UserRole>([UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION]);
const formats = {
  'application/pdf': { extensions: ['.pdf'], signature: (b: Buffer) => b.subarray(0, 4).toString() === '%PDF', inline: true },
  'image/jpeg': { extensions: ['.jpg', '.jpeg'], signature: (b: Buffer) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff, inline: true },
  'image/png': { extensions: ['.png'], signature: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), inline: true },
} as const;

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  private authorize(user: UserContext) { if (!user || !allowedRoles.has(user.role)) throw new ForbiddenException('Usuário sem permissão para acessar arquivos de documentos.'); }
  private safe<T extends { storagePath: string; fileName: string }>(document: T, available?: boolean) {
    const { storagePath: _storagePath, fileName: _fileName, ...metadata } = document;
    return { ...metadata, ...(available === undefined ? {} : { fileAvailable: available }) };
  }
  private async availability<T extends { storagePath: string; fileName: string; status: DocumentStatus }>(document: T) {
    return this.safe(document, document.status === DocumentStatus.ACTIVE && await this.storage.exists(document.storagePath));
  }

  async findAll() {
    const documents = await this.prisma.document.findMany({ include: { student: true, uploader: { select: { id: true, name: true, email: true } } } });
    return { module: 'Documents', total: documents.length, data: await Promise.all(documents.map((item) => this.availability(item))) };
  }
  async findOne(id: number) {
    const document = await this.prisma.document.findUnique({ where: { id }, include: { student: true, uploader: { select: { id: true, name: true, email: true } } } });
    if (!document) throw new NotFoundException(`Documento com id ${id} não encontrado.`);
    return this.availability(document);
  }
  async findByStudent(studentId: number) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
    if (!student) throw new NotFoundException(`Estudante com id ${studentId} não encontrado.`);
    const documents = await this.prisma.document.findMany({ where: { studentId, status: { not: DocumentStatus.DELETED } }, include: { uploader: { select: { id: true, name: true, email: true } } } });
    return { module: 'Documents', total: documents.length, data: await Promise.all(documents.map((item) => this.availability(item))) };
  }

  async upload(studentId: number, type: DocumentType, file: UploadedDocumentFile, user: UserContext) {
    this.authorize(user);
    if (!Object.values(DocumentType).includes(type)) throw new BadRequestException('Tipo de documento inválido.');
    if (!file?.buffer?.length) throw new BadRequestException('Arquivo é obrigatório.');
    const student = await this.prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
    if (!student) throw new NotFoundException(`Estudante com id ${studentId} não encontrado.`);
    const max = Number(process.env.DOCUMENT_MAX_SIZE_MB ?? 10) * 1024 * 1024;
    if (file.size > max || file.buffer.length > max) throw new BadRequestException(`Arquivo excede o limite de ${process.env.DOCUMENT_MAX_SIZE_MB ?? 10} MB.`);
    const format = formats[file.mimetype as keyof typeof formats];
    const extension = extname(file.originalname).toLowerCase();
    if (!format || !format.extensions.includes(extension as never) || !format.signature(file.buffer)) throw new BadRequestException('Formato, extensão ou conteúdo do arquivo não permitido.');
    const key = `${randomUUID()}${extension}`;
    await this.storage.save(key, file.buffer);
    try {
      const document = await this.prisma.document.create({ data: { studentId, type, fileName: key, originalName: file.originalname, mimeType: file.mimetype, extension: extension.slice(1), size: file.buffer.length, storagePath: key, uploadedBy: user.id }, include: { uploader: { select: { id: true, name: true, email: true } } } });
      return { message: 'Documento enviado com sucesso!', data: this.safe(document, true) };
    } catch (error) { await this.storage.delete(key); throw error; }
  }

  async getFile(id: number, user: UserContext) {
    this.authorize(user);
    const document = await this.prisma.document.findUnique({ where: { id } });
    if (!document || document.status === DocumentStatus.DELETED) throw new NotFoundException(`Documento com id ${id} não encontrado.`);
    if (!await this.storage.exists(document.storagePath)) throw new NotFoundException('Arquivo do documento não encontrado no storage.');
    return { data: await this.storage.get(document.storagePath), mimeType: document.mimeType, originalName: document.originalName, inline: document.mimeType === 'application/pdf' || document.mimeType.startsWith('image/') };
  }

  async create(dto: CreateDocumentDto) {
    const student = await this.prisma.student.findUnique({ where: { id: dto.studentId } });
    if (!student) throw new NotFoundException(`Estudante com id ${dto.studentId} não encontrado.`);
    const uploader = await this.prisma.user.findUnique({ where: { id: dto.uploadedBy } });
    if (!uploader) throw new NotFoundException(`Usuário com id ${dto.uploadedBy} não encontrado.`);
    const document = await this.prisma.document.create({ data: { ...dto, type: dto.type as DocumentType, status: dto.status ?? DocumentStatus.ACTIVE }, include: { student: true, uploader: { select: { id: true, name: true, email: true } } } });
    return { message: 'Documento cadastrado com sucesso!', data: this.safe(document) };
  }
  async update(id: number, dto: UpdateDocumentDto) {
    const existing = await this.prisma.document.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Documento com id ${id} não encontrado.`);
    const updated = await this.prisma.document.update({ where: { id }, data: { ...dto, type: dto.type as DocumentType | undefined, status: dto.status as DocumentStatus | undefined }, include: { uploader: { select: { id: true, name: true, email: true } } } });
    return { message: 'Documento atualizado com sucesso!', data: this.safe(updated) };
  }
  async remove(id: number, user: UserContext) {
    this.authorize(user);
    const existing = await this.prisma.document.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Documento com id ${id} não encontrado.`);
    const backup = await this.storage.exists(existing.storagePath) ? await this.storage.get(existing.storagePath) : null;
    if (backup) await this.storage.delete(existing.storagePath);
    try { await this.prisma.document.update({ where: { id }, data: { status: DocumentStatus.DELETED } }); }
    catch (error) { if (backup) await this.storage.save(existing.storagePath, backup); throw error; }
    return { message: 'Documento removido com sucesso!' };
  }
}
