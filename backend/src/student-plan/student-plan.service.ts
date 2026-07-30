import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentPlanDto } from './dto/create-student-plan.dto';
import { UpdateStudentPlanDto } from './dto/update-student-plan.dto';

@Injectable()
export class StudentPlanService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.studentPlan.findMany({
      include: {
        student: true,
        plan: true,
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.studentPlan.findUnique({
      where: { id },
      include: {
        student: true,
        plan: true,
      },
    });
  }

  async create(createStudentPlanDto: CreateStudentPlanDto) {
    return this.prisma.studentPlan.create({
      data: createStudentPlanDto,
      include: {
        student: true,
        plan: true,
      },
    });
  }

  async update(id: number, updateStudentPlanDto: UpdateStudentPlanDto) {
    return this.prisma.studentPlan.update({
      where: { id },
      data: updateStudentPlanDto,
      include: {
        student: true,
        plan: true,
      },
    });
  }

  async remove(id: number) {
    await this.prisma.studentPlan.delete({
      where: { id },
    });

    return {
      message: 'Associação removida com sucesso!',
    };
  }
}
