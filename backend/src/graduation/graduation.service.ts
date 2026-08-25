import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BeltRank, GraduationStatus, UserRole } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CancelGraduationDto, CreateGraduationDto, UpdateGraduationDto } from './dto/graduation.dto';

type Actor = { id: number; role: UserRole };
type Level = { id: number; code: string; minDegree: number | null; maxDegree: number | null };
const academicRoles = [UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER];
const include = {
  modality: true,
  graduationLevel: true,
  actor: { select: { id: true, name: true } },
  correctedByUser: { select: { id: true, name: true } },
  cancelledByUser: { select: { id: true, name: true } },
  corrects: true,
  correctedVersion: true,
};

@Injectable()
export class GraduationService {
  constructor(private readonly prisma: PrismaService) {}

  private async actor(actor: Actor, allowedRoles: UserRole[]) {
    const current = await this.prisma.user.findUnique({ where: { id: actor.id }, select: { id: true, role: true, active: true } });
    if (!current?.active) throw new ForbiddenException('Usuário responsável inexistente ou inativo.');
    if (!allowedRoles.includes(current.role)) throw new ForbiddenException('Usuário sem autorização para esta operação acadêmica.');
    return current;
  }

  private async studentAccess(studentId: number, actor: Actor, modalityId?: number) {
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        ...(actor.role === UserRole.TEACHER ? {
          studentClasses: { some: {
            status: 'ACTIVE',
            class: { active: true, teacherUserId: actor.id, ...(modalityId ? { modalityId } : {}) },
          } },
        } : {}),
      },
      select: { id: true },
    });
    if (!student) {
      if (actor.role === UserRole.TEACHER) throw new ForbiddenException('Professor sem turma ativa desta modalidade para o aluno.');
      throw new NotFoundException('Aluno não encontrado.');
    }
  }

  private assertNotFuture(value: Date, field: string) {
    if (value.getTime() > Date.now()) throw new BadRequestException(`${field} não pode estar no futuro.`);
  }

  private async level(modalityId: number, levelId?: number, legacyBelt?: string): Promise<Level> {
    if (!levelId && !legacyBelt) throw new BadRequestException('Informe graduationLevelId ou belt.');
    const level = await this.prisma.graduationLevel.findFirst({
      where: { modalityId, active: true, ...(levelId ? { id: levelId } : { code: legacyBelt }) },
      select: { id: true, code: true, minDegree: true, maxDegree: true },
    });
    if (!level) {
      const configured = await this.prisma.graduationLevel.count({ where: { modalityId, active: true } });
      if (configured === 0) throw new ConflictException('O catálogo acadêmico desta modalidade ainda não está configurado.');
      throw new ConflictException('Graduação incompatível com a modalidade ou inativa.');
    }
    if (legacyBelt !== undefined && level.code !== legacyBelt) {
      throw new ConflictException('O belt informado não corresponde ao GraduationLevel selecionado.');
    }
    return level;
  }

  private assertDegree(level: Level, degree?: number) {
    if (level.minDegree === null || level.maxDegree === null) {
      if (degree !== undefined) throw new ConflictException('Este nível não utiliza grau.');
      return;
    }
    if (degree === undefined || degree < level.minDegree || degree > level.maxDegree) throw new ConflictException(`Grau deve estar entre ${level.minDegree} e ${level.maxDegree}.`);
  }

  private duplicateError(error: unknown): never {
    if (typeof error === 'object' && error !== null && 'code' in error && ((error as { code?: string }).code === 'P2002' || (error as { code?: string }).code === '23505')) {
      throw new ConflictException('Esta graduação já foi registrada para o aluno nesta data.');
    }
    throw error;
  }

  findAvailable(modalityId?: number) {
    return this.prisma.graduationLevel.findMany({
      where: { active: true, modality: { active: true, hasGraduation: true }, ...(modalityId ? { modalityId } : {}) },
      include: { modality: true },
      orderBy: [{ modalityId: 'asc' }, { rankOrder: 'asc' }],
    });
  }

  async findAll(studentId: number, actor: Actor) {
    await this.actor(actor, [UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION, UserRole.TEACHER]);
    await this.studentAccess(studentId, actor);
    return this.prisma.graduation.findMany({ where: { studentId }, include, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
  }

  async findCurrent(studentId: number, actor: Actor) {
    await this.actor(actor, [UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION, UserRole.TEACHER]);
    await this.studentAccess(studentId, actor);
    const rows = await this.prisma.graduation.findMany({ where: { studentId, status: GraduationStatus.ACTIVE }, include, orderBy: [{ modalityId: 'asc' }, { graduatedAt: 'desc' }, { id: 'desc' }] });
    return rows.filter((row, index) => rows.findIndex((candidate) => candidate.modalityId === row.modalityId) === index);
  }

  async create(studentId: number, dto: CreateGraduationDto, actor: Actor) {
    const currentActor = await this.actor(actor, academicRoles);
    await this.studentAccess(studentId, currentActor, dto.modalityId);
    const graduatedAt = new Date(dto.graduatedAt);
    const beltStartedAt = new Date(dto.beltStartedAt);
    this.assertNotFuture(graduatedAt, 'A data da graduação');
    this.assertNotFuture(beltStartedAt, 'A data de início da graduação');
    if (beltStartedAt > graduatedAt) throw new BadRequestException('A data de início não pode ser posterior à graduação.');
    const modality = await this.prisma.modality.findFirst({ where: { id: dto.modalityId, active: true, hasGraduation: true }, select: { id: true } });
    if (!modality) throw new ConflictException('Modalidade ativa não permite graduação.');
    const membership = await this.prisma.studentModality.findFirst({ where: { studentId, modalityId: dto.modalityId, status: { in: ['ACTIVE', 'PAUSED'] }, startedAt: { lte: graduatedAt } }, select: { id: true } });
    if (!membership) throw new ConflictException('Aluno não possui vínculo vigente com a modalidade na data informada.');
    const level = await this.level(dto.modalityId, dto.graduationLevelId, dto.belt);
    this.assertDegree(level, dto.degree);
    const duplicate = await this.prisma.graduation.findFirst({ where: { studentId, modalityId: dto.modalityId, graduationLevelId: level.id, degree: dto.degree ?? null, graduatedAt, status: GraduationStatus.ACTIVE }, select: { id: true } });
    if (duplicate) throw new ConflictException('Esta graduação já foi registrada para o aluno nesta data.');
    try {
      return await this.prisma.graduation.create({ data: { studentId, modalityId: dto.modalityId, graduationLevelId: level.id, degree: dto.degree, belt: dto.belt, beltStartedAt, graduatedAt, notes: dto.notes, graduatedBy: currentActor.id }, include });
    } catch (error) {
      this.duplicateError(error);
    }
  }

  async update(id: number, dto: UpdateGraduationDto, actor: Actor) {
    const currentActor = await this.actor(actor, [UserRole.OWNER, UserRole.ADMIN]);
    const current = await this.prisma.graduation.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Graduação não encontrada.');
    if (current.status !== GraduationStatus.ACTIVE) throw new ConflictException('Somente a versão ativa pode ser corrigida.');
    const graduatedAt = dto.graduatedAt ? new Date(dto.graduatedAt) : current.graduatedAt;
    const beltStartedAt = dto.beltStartedAt ? new Date(dto.beltStartedAt) : current.beltStartedAt;
    this.assertNotFuture(graduatedAt, 'A data da graduação');
    this.assertNotFuture(beltStartedAt, 'A data de início da graduação');
    if (beltStartedAt > graduatedAt) throw new BadRequestException('A data de início não pode ser posterior à graduação.');
    const levelId = dto.graduationLevelId ?? current.graduationLevelId ?? undefined;
    const beltForValidation = dto.belt ?? (dto.graduationLevelId === undefined ? current.belt ?? undefined : undefined);
    const level = await this.level(current.modalityId, levelId, beltForValidation);
    const degree = dto.degree ?? current.degree ?? undefined;
    this.assertDegree(level, degree);
    const correctedAt = new Date();
    const belt: BeltRank | null = dto.belt ?? (dto.graduationLevelId === undefined ? current.belt : null);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const superseded = await tx.graduation.updateMany({ where: { id, status: GraduationStatus.ACTIVE }, data: { status: GraduationStatus.SUPERSEDED } });
        if (superseded.count !== 1) throw new ConflictException('A graduação já foi corrigida ou cancelada.');
        return tx.graduation.create({
          data: {
            studentId: current.studentId, modalityId: current.modalityId, graduationLevelId: level.id, degree, belt,
            beltStartedAt, graduatedAt, notes: dto.notes ?? current.notes, graduatedBy: current.graduatedBy,
            correctedBy: currentActor.id, correctedAt, correctionReason: dto.correctionReason, correctsGraduationId: current.id,
          },
          include,
        });
      });
    } catch (error) {
      this.duplicateError(error);
    }
  }

  async cancel(id: number, dto: CancelGraduationDto, actor: Actor) {
    const currentActor = await this.actor(actor, [UserRole.OWNER, UserRole.ADMIN]);
    const cancelledAt = new Date();
    const cancelled = await this.prisma.graduation.updateMany({
      where: { id, status: GraduationStatus.ACTIVE },
      data: { status: GraduationStatus.CANCELLED, cancelledBy: currentActor.id, cancelledAt, cancellationReason: dto.reason },
    });
    if (cancelled.count !== 1) {
      const exists = await this.prisma.graduation.findUnique({ where: { id }, select: { id: true } });
      if (!exists) throw new NotFoundException('Graduação não encontrada.');
      throw new ConflictException('Somente a versão ativa pode ser cancelada.');
    }
    const result = await this.prisma.graduation.findUnique({ where: { id }, include });
    if (!result) throw new NotFoundException('Graduação não encontrada após o cancelamento.');
    return result;
  }
}
