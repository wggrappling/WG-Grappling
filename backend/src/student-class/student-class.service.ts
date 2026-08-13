import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentClassDto } from './dto/create-student-class.dto';

@Injectable()
export class StudentClassService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.studentClass.findMany({
      include: {
        student: true,
        class: true,
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.studentClass.findUnique({
      where: { id },
      include: {
        student: true,
        class: true,
      },
    });
  }

  async create(createStudentClassDto: CreateStudentClassDto) {
    const student = await this.prisma.student.findUnique({ where: { id: createStudentClassDto.studentId } });
    if (!student) {
      throw new NotFoundException(`Student com id ${createStudentClassDto.studentId} não encontrado.`);
    }

    const classRecord = await this.prisma.class.findFirst({ where: { id: createStudentClassDto.classId, active: true } });
    if (!classRecord) {
      throw new NotFoundException(`Class com id ${createStudentClassDto.classId} não encontrado.`);
    }

    const activeModality = await this.prisma.studentModality.findFirst({
      where: { studentId: createStudentClassDto.studentId, modalityId: classRecord.modalityId, status: 'ACTIVE' },
    });
    if (!activeModality) throw new ConflictException('O aluno precisa possuir vínculo ativo com a modalidade da turma.');

    const existingAssociation = await this.prisma.studentClass.findFirst({
      where: {
        studentId: createStudentClassDto.studentId,
        classId: createStudentClassDto.classId,
      },
    });

    if (existingAssociation) {
      throw new ConflictException('Este aluno já está associado a esta turma.');
    }

    return this.prisma.studentClass.create({
      data: createStudentClassDto,
      include: {
        student: true,
        class: true,
      },
    });
  }

  async remove(id: number) {
    await this.prisma.studentClass.delete({ where: { id } });

    return {
      message: 'Associação removida com sucesso!',
    };
  }
}
