import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { StudentModalityStatus } from '../../generated/prisma/enums';
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
      this.prisma.studentModality.findFirst({
        where: {
          studentId: createStudentModalityDto.studentId,
          modalityId: createStudentModalityDto.modalityId,
          status: { in: [StudentModalityStatus.ACTIVE, StudentModalityStatus.PAUSED] },
        },
      }),
    ]);
    if (!student) throw new NotFoundException('Aluno não encontrado.');
    if (!modality) throw new NotFoundException('Modalidade ativa não encontrada.');
    if (existing?.status === StudentModalityStatus.ACTIVE) {
      throw new ConflictException('Este aluno já possui vínculo ativo com esta modalidade.');
    }
    if (existing?.status === StudentModalityStatus.PAUSED) {
      return this.prisma.studentModality.update({
        where: { id: existing.id },
        data: { status: StudentModalityStatus.ACTIVE, resumedAt: new Date() },
        include: { student: true, modality: true },
      });
    }
    return this.prisma.studentModality.create({
      data: { ...createStudentModalityDto, status: StudentModalityStatus.ACTIVE },
      include: {
        student: true,
        modality: true,
      },
    });
  }

  async update(id: number, updateStudentModalityDto: UpdateStudentModalityDto) {
    const current = await this.prisma.studentModality.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Vínculo de modalidade não encontrado.');
    if (current.status === StudentModalityStatus.FINISHED) {
      throw new ConflictException('Um vínculo finalizado não pode ser alterado; crie um novo período.');
    }
    if (updateStudentModalityDto.studentId !== undefined || updateStudentModalityDto.modalityId !== undefined || updateStudentModalityDto.startedAt !== undefined) {
      throw new ConflictException('Aluno, modalidade e data inicial não podem ser alterados no vínculo existente.');
    }
    if (updateStudentModalityDto.status && updateStudentModalityDto.status !== StudentModalityStatus.ACTIVE) {
      const activeClass = await this.prisma.studentClass.findFirst({
        where: { studentId: current.studentId, status: 'ACTIVE', class: { modalityId: current.modalityId } },
        select: { id: true },
      });
      if (activeClass) throw new ConflictException('Encerre os vínculos ativos de turma antes de pausar ou finalizar a modalidade.');
    }
    const now = new Date();
    const statusData = updateStudentModalityDto.status === StudentModalityStatus.PAUSED
      ? { pausedAt: now }
      : updateStudentModalityDto.status === StudentModalityStatus.ACTIVE && current.status === StudentModalityStatus.PAUSED
        ? { resumedAt: now }
        : updateStudentModalityDto.status === StudentModalityStatus.FINISHED
          ? { finishedAt: now }
          : {};
    return this.prisma.studentModality.update({
      where: { id },
      data: { ...updateStudentModalityDto, ...statusData },
      include: {
        student: true,
        modality: true,
      },
    });
  }

  async remove(id: number) {
    const current = await this.prisma.studentModality.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Vínculo de modalidade não encontrado.');
    if (current.status === StudentModalityStatus.FINISHED) {
      throw new ConflictException('O vínculo de modalidade já está finalizado.');
    }
    const activeClass = await this.prisma.studentClass.findFirst({
      where: { studentId: current.studentId, status: 'ACTIVE', class: { modalityId: current.modalityId } },
      select: { id: true },
    });
    if (activeClass) throw new ConflictException('Encerre os vínculos ativos de turma antes de finalizar a modalidade.');
    await this.prisma.studentModality.update({
      where: { id },
      data: { status: StudentModalityStatus.FINISHED, finishedAt: new Date() },
    });

    return {
      message: 'Associação finalizada com sucesso!',
    };
  }
}
