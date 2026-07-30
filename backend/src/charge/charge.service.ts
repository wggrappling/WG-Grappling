import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChargeDto } from './dto/create-charge.dto';
import { UpdateChargeDto } from './dto/update-charge.dto';

@Injectable()
export class ChargeService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const charges = await this.prisma.charge.findMany({
      include: {
        student: true,
        plan: true,
      },
    });

    return {
      module: 'Charges',
      total: charges.length,
      data: charges,
    };
  }

  async findOne(id: number) {
    return this.prisma.charge.findUnique({
      where: { id },
      include: {
        student: true,
        plan: true,
      },
    });
  }

  async create(createChargeDto: CreateChargeDto) {
    return this.prisma.charge.create({
      data: {
        ...createChargeDto,
        originalAmount: createChargeDto.originalAmount,
        discountAmount: createChargeDto.discountAmount ?? 0,
        finalAmount: createChargeDto.finalAmount,
        referenceMonth: createChargeDto.referenceMonth,
      },
      include: {
        student: true,
        plan: true,
      },
    });
  }

  async update(id: number, updateChargeDto: UpdateChargeDto) {
    return this.prisma.charge.update({
      where: { id },
      data: updateChargeDto,
      include: {
        student: true,
        plan: true,
      },
    });
  }

  async remove(id: number) {
    await this.prisma.charge.delete({
      where: { id },
    });

    return {
      message: 'Cobrança removida com sucesso!',
    };
  }
}
