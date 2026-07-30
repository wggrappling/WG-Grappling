import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const plans = await this.prisma.plan.findMany();
    return {
      module: 'Plans',
      total: plans.length,
      data: plans,
    };
  }

  async findOne(id: number) {
    return this.prisma.plan.findUnique({
      where: { id },
    });
  }

  async create(createPlanDto: CreatePlanDto) {
    return this.prisma.plan.create({
      data: createPlanDto,
    });
  }

  async update(id: number, updatePlanDto: UpdatePlanDto) {
    return this.prisma.plan.update({
      where: { id },
      data: updatePlanDto,
    });
  }

  async remove(id: number) {
    await this.prisma.plan.delete({
      where: { id },
    });

    return {
      message: 'Plano removido com sucesso!',
    };
  }
}
