import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentModalityDto } from './dto/create-student-modality.dto';
import { UpdateStudentModalityDto } from './dto/update-student-modality.dto';

@Injectable()
export class StudentModalityService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.studentModality.findMany({
      include: {
        student: true,
        modality: true,
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.studentModality.findUnique({
      where: { id },
      include: {
        student: true,
        modality: true,
      },
    });
  }

  async create(createStudentModalityDto: CreateStudentModalityDto) {
    return this.prisma.studentModality.create({
      data: createStudentModalityDto,
      include: {
        student: true,
        modality: true,
      },
    });
  }

  async update(id: number, updateStudentModalityDto: UpdateStudentModalityDto) {
    return this.prisma.studentModality.update({
      where: { id },
      data: updateStudentModalityDto,
      include: {
        student: true,
        modality: true,
      },
    });
  }

  async remove(id: number) {
    await this.prisma.studentModality.delete({
      where: { id },
    });

    return {
      message: 'Associação removida com sucesso!',
    };
  }
}
