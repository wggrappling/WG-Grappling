import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { StudentClassStatus } from '../../generated/prisma/enums';
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

    const classRecord = await this.prisma.class.findFirst({
      where: { id: createStudentClassDto.classId, active: true, teacher: { active: true } },
      include: { _count: { select: { studentClasses: { where: { status: StudentClassStatus.ACTIVE } } } } },
    });
    if (!classRecord) {
      throw new NotFoundException(`Class com id ${createStudentClassDto.classId} não encontrado.`);
    }

    const activeModality = await this.prisma.studentModality.findFirst({
      where: { studentId: createStudentClassDto.studentId, modalityId: classRecord.modalityId, status: 'ACTIVE' },
    });
    if (!activeModality) throw new ConflictException('O aluno precisa possuir vínculo ativo com a modalidade da turma.');

    if (classRecord._count.studentClasses >= classRecord.capacity) {
      throw new ConflictException('A turma atingiu a capacidade.');
    }
    const existingAssociation = await this.prisma.studentClass.findFirst({
      where: {
        studentId: createStudentClassDto.studentId,
        classId: createStudentClassDto.classId,
        status: StudentClassStatus.ACTIVE,
      },
    });

    if (existingAssociation) {
      throw new ConflictException('Este aluno já está associado a esta turma.');
    }

    return this.prisma.studentClass.create({
      data: { ...createStudentClassDto, status: StudentClassStatus.ACTIVE, joinedAt: new Date() },
      include: {
        student: true,
        class: true,
      },
    });
  }

  async remove(id: number) {
    const current = await this.prisma.studentClass.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Vínculo de turma não encontrado.');
    if (current.status === StudentClassStatus.FINISHED) {
      throw new ConflictException('O vínculo de turma já está encerrado.');
    }
    await this.prisma.studentClass.update({
      where: { id },
      data: { status: StudentClassStatus.FINISHED, leftAt: new Date() },
    });

    return {
      message: 'Associação encerrada com sucesso!',
    };
  }
}
