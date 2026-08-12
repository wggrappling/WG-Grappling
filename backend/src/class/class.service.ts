import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { UserRole } from '../../generated/prisma/enums';
type UserContext = { id: number; role: UserRole };

const safeRelations = {
  modality: true,
  teacher: { select: { id: true, name: true, email: true, role: true, active: true, createdAt: true } },
} as const;

@Injectable()
export class ClassService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user?: UserContext) {
    return this.prisma.class.findMany({
      where: user?.role === UserRole.TEACHER ? { teacherUserId: user.id } : undefined,
      include: safeRelations,
    });
  }

  async findOne(id: number, user?: UserContext) {
    const record = await this.prisma.class.findFirst({
      where: { id, ...(user?.role === UserRole.TEACHER ? { teacherUserId: user.id } : {}) },
      include: safeRelations,
    });
    if (!record && user?.role === UserRole.TEACHER) throw new ForbiddenException('Professor sem acesso a esta turma.');
    return record;
  }

  async getStudentsByClassId(classId: number, user?: UserContext) {
    const classRecord = await this.prisma.class.findFirst({
      where: { id: classId, ...(user?.role === UserRole.TEACHER ? { teacherUserId: user.id } : {}) },
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

    if (!classRecord && user?.role === UserRole.TEACHER) throw new ForbiddenException('Professor sem acesso a esta turma.');
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
