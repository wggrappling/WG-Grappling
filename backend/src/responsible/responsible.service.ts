import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResponsibleDto } from './dto/create-responsible.dto';
import { UpdateResponsibleDto } from './dto/update-responsible.dto';

@Injectable()
export class ResponsibleService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const responsibles = await this.prisma.responsible.findMany({
      include: { students: { include: { student: true } } },
    });

    return {
      module: 'Responsible',
      total: responsibles.length,
      data: responsibles,
    };
  }

  async findOne(id: number) {
    const responsible = await this.prisma.responsible.findUnique({
      where: { id },
      include: { students: { include: { student: true } } },
    });

    if (!responsible) {
      throw new NotFoundException(`Responsável com id ${id} não encontrado.`);
    }

    return responsible;
  }

  async create(createResponsibleDto: CreateResponsibleDto) {
    const responsible = await this.prisma.responsible.create({
      data: createResponsibleDto,
    });

    return {
      message: 'Responsável cadastrado com sucesso!',
      data: responsible,
    };
  }

  async update(id: number, updateResponsibleDto: UpdateResponsibleDto) {
    const existing = await this.prisma.responsible.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Responsável com id ${id} não encontrado.`);
    }

    const responsible = await this.prisma.responsible.update({
      where: { id },
      data: updateResponsibleDto,
    });

    return {
      message: 'Responsável atualizado com sucesso!',
      data: responsible,
    };
  }

  async remove(id: number) {
    await this.prisma.responsible.delete({
      where: { id },
    });

    return {
      message: 'Responsável removido com sucesso!',
    };
  }
}
