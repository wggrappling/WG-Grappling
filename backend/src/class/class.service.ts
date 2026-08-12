import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

const safeRelations = {
  modality: true,
  teacher: { select: { id: true, name: true, email: true, role: true, active: true, createdAt: true } },
} as const;

@Injectable()
export class ClassService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.class.findMany({
      include: safeRelations,
    });
  }

  async findOne(id: number) {
    return this.prisma.class.findUnique({
      where: { id },
      include: safeRelations,
    });
  }

  async getStudentsByClassId(classId: number) {
    const classRecord = await this.prisma.class.findUnique({
      where: { id: classId },
      select: {
        id: true,
        name: true,
        modality: {
          select: {
            id: true,
            name: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
          },
        },
        studentClasses: {
          select: {
            student: {
              select: {
                id: true,
                person: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!classRecord) {
      throw new NotFoundException('Class not found.');
    }

    const students = classRecord.studentClasses
      .map((entry) => ({
        id: entry.student.id,
        name: entry.student.person.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      class: {
        id: classRecord.id,
        name: classRecord.name,
        teacher: classRecord.teacher.name,
        modality: classRecord.modality.name,
      },
      students,
      totalStudents: students.length,
    };
  }

  async create(createClassDto: CreateClassDto) {
    return this.prisma.class.create({
      data: createClassDto,
      include: safeRelations,
    });
  }

  async update(id: number, updateClassDto: UpdateClassDto) {
    return this.prisma.class.update({
      where: { id },
      data: updateClassDto,
      include: safeRelations,
    });
  }

  async remove(id: number) {
    await this.prisma.class.delete({
      where: { id },
    });

    return {
      message: 'Turma removida com sucesso!',
    };
  }
}
