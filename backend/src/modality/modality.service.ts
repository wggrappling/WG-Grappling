import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateModalityDto } from './dto/create-modality.dto';
import { UpdateModalityDto } from './dto/update-modality.dto';

@Injectable()
export class ModalityService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.modality.findMany();
  }

  async findOne(id: number) {
    return this.prisma.modality.findUnique({
      where: { id },
    });
  }

  async create(createModalityDto: CreateModalityDto) {
    return this.prisma.modality.create({
      data: createModalityDto,
    });
  }

  async update(id: number, updateModalityDto: UpdateModalityDto) {
    return this.prisma.modality.update({
      where: { id },
      data: updateModalityDto,
    });
  }

  async remove(id: number) {
    await this.prisma.modality.delete({
      where: { id },
    });

    return {
      message: 'Modalidade removida com sucesso!',
    };
  }
}
