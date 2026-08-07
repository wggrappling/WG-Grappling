import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus, DocumentType, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const documents = await this.prisma.document.findMany({
      include: {
        student: true,
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      module: 'Documents',
      total: documents.length,
      data: documents,
    };
  }

  async findOne(id: number) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        student: true,
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`Documento com id ${id} não encontrado.`);
    }

    return document;
  }

  async findByStudent(studentId: number) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException(`Estudante com id ${studentId} não encontrado.`);
    }

    const documents = await this.prisma.document.findMany({
      where: { studentId },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      module: 'Documents',
      total: documents.length,
      data: documents,
    };
  }

  async create(createDocumentDto: CreateDocumentDto) {
    const student = await this.prisma.student.findUnique({
      where: { id: createDocumentDto.studentId },
    });

    if (!student) {
      throw new NotFoundException(`Estudante com id ${createDocumentDto.studentId} não encontrado.`);
    }

    const uploader = await this.prisma.user.findUnique({
      where: { id: createDocumentDto.uploadedBy },
    });

    if (!uploader) {
      throw new NotFoundException(`Usuário com id ${createDocumentDto.uploadedBy} não encontrado.`);
    }

    const document = await this.prisma.document.create({
      data: {
        ...createDocumentDto,
        type: createDocumentDto.type as DocumentType,
        status: createDocumentDto.status ?? DocumentStatus.ACTIVE,
      },
      include: {
        student: true,
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      message: 'Documento cadastrado com sucesso!',
      data: document,
    };
  }

  async update(id: number, updateDocumentDto: UpdateDocumentDto) {
    const existing = await this.prisma.document.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Documento com id ${id} não encontrado.`);
    }

    if (updateDocumentDto.studentId) {
      const student = await this.prisma.student.findUnique({
        where: { id: updateDocumentDto.studentId },
      });

      if (!student) {
        throw new NotFoundException(`Estudante com id ${updateDocumentDto.studentId} não encontrado.`);
      }
    }

    if (updateDocumentDto.uploadedBy) {
      const uploader = await this.prisma.user.findUnique({
        where: { id: updateDocumentDto.uploadedBy },
      });

      if (!uploader) {
        throw new NotFoundException(`Usuário com id ${updateDocumentDto.uploadedBy} não encontrado.`);
      }
    }

    const updatedDocument = await this.prisma.document.update({
      where: { id },
      data: {
        ...updateDocumentDto,
        type: updateDocumentDto.type as DocumentType | undefined,
        status: updateDocumentDto.status as DocumentStatus | undefined,
      },
      include: {
        student: true,
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      message: 'Documento atualizado com sucesso!',
      data: updatedDocument,
    };
  }

  async remove(id: number) {
    const existing = await this.prisma.document.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Documento com id ${id} não encontrado.`);
    }

    const document = await this.prisma.document.update({
      where: { id },
      data: { status: DocumentStatus.DELETED },
    });

    return {
      message: 'Documento removido com sucesso!',
      data: document,
    };
  }
}
