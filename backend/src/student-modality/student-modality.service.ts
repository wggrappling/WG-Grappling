import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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
    const [student, modality, existing] = await Promise.all([
      this.prisma.student.findUnique({ where: { id: createStudentModalityDto.studentId }, select: { id: true } }),
      this.prisma.modality.findFirst({ where: { id: createStudentModalityDto.modalityId, active: true }, select: { id: true } }),
      this.prisma.studentModality.findUnique({ where: { studentId_modalityId: { studentId: createStudentModalityDto.studentId, modalityId: createStudentModalityDto.modalityId } } }),
    ]);
    if (!student) throw new NotFoundException('Aluno não encontrado.');
    if (!modality) throw new NotFoundException('Modalidade ativa não encontrada.');
    if (existing) throw new ConflictException('Este aluno já possui vínculo com esta modalidade.');
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
