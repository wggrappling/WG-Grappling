import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentModalityStatus, StudentPlanStatus } from '../../generated/prisma/enums';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const students = await this.prisma.student.findMany({ include: { person: true } });
    return {
      module: 'Students',
      total: students.length,
      data: students,
    };
  }

  async findOne(id: number) {
    return await this.prisma.student.findUnique({
      where: { id },
      include: {
        person: {
          include: { address: true },
        },
        responsibles: {
          include: { responsible: true },
        },
        modalities: {
          where: { status: StudentModalityStatus.ACTIVE },
          include: { modality: true },
        },
        plans: {
          where: { status: StudentPlanStatus.ACTIVE },
          include: { plan: true },
        },
        studentClasses: {
          include: {
            class: {
              include: {
                modality: true,
                teacher: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    active: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async create(createStudentDto: CreateStudentDto) {
    return await this.prisma.student.create({
      data: createStudentDto,
      include: { person: true },
    });
  }

  async update(id: number, updateStudentDto: UpdateStudentDto) {
    return await this.prisma.student.update({
      where: { id },
      data: updateStudentDto,
      include: { person: true },
    });
  }

  async remove(id: number) {
    await this.prisma.student.delete({
      where: { id },
    });

    return {
      message: 'Estudante removido com sucesso!',
    };
  }
}
