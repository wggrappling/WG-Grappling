import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { StudentClassStatus, StudentModalityStatus, UserRole } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { CreateAttendanceBatchDto } from './dto/create-attendance-batch.dto';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

type UserContext = { id: number; role: UserRole };
type Client = PrismaService | any;
const attendanceDay = (value: Date) => new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
const isDuplicate = (error: unknown) => typeof error === 'object' && error !== null && 'code' in error
  && ['P2002', '23505'].includes(String((error as { code?: string }).code));

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  private async activeActor(client: Client, actor?: UserContext) {
    if (!actor) throw new ForbiddenException('Usuário responsável não informado.');
    const current = await client.user.findUnique({ where: { id: actor.id }, select: { id: true, role: true, active: true } });
    if (!current?.active) throw new ForbiddenException('Usuário responsável inexistente ou inativo.');
    return current as UserContext;
  }

  private normalizedDate(value: string) {
    const date = attendanceDay(new Date(value));
    if (date > attendanceDay(new Date())) throw new BadRequestException('Não é permitido registrar presença em data futura.');
    return date;
  }

  private async academicContext(client: Client, classId: number, studentId: number, actor: UserContext) {
    const classRecord = await client.class.findFirst({ where: { id: classId, active: true, modality: { active: true }, teacher: { active: true } }, select: { id: true, modalityId: true, teacherUserId: true } });
    if (!classRecord) throw new NotFoundException('Turma ativa não encontrada.');
    if (actor.role === UserRole.TEACHER && classRecord.teacherUserId !== actor.id) throw new ForbiddenException('Professor sem autorização para esta turma.');
    const membership = await client.studentClass.findFirst({ where: { classId, studentId, status: StudentClassStatus.ACTIVE }, select: { id: true } });
    if (!membership) throw new ConflictException('Aluno não possui vínculo ativo com esta turma.');
    const modality = await client.studentModality.findFirst({ where: { studentId, modalityId: classRecord.modalityId, status: StudentModalityStatus.ACTIVE }, select: { id: true } });
    if (!modality) throw new ConflictException('Aluno não possui vínculo ativo com a modalidade da turma.');
    return classRecord;
  }

  async findAll(query: AttendanceQueryDto = {}, user?: UserContext) {
    const { studentId, classId, startDate, endDate } = query;
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) throw new BadRequestException('startDate deve ser anterior ou igual a endDate.');
    return this.prisma.attendance.findMany({ where: { ...(studentId === undefined ? {} : { studentId }), ...(classId === undefined ? {} : { classId }), ...(!startDate && !endDate ? {} : { attendanceDate: { ...(startDate ? { gte: new Date(startDate) } : {}), ...(endDate ? { lte: new Date(endDate) } : {}) } }), ...(user?.role === UserRole.TEACHER ? { class: { teacherUserId: user.id } } : {}) }, include: { class: { include: { modality: true } }, student: { select: { id: true, enrollmentNumber: true } }, recordedByUser: { select: { id: true, name: true } }, correctedByUser: { select: { id: true, name: true } } }, orderBy: { attendanceDate: 'desc' } });
  }

  async findOne(id: number, user?: UserContext) {
    const attendance = await this.prisma.attendance.findFirst({ where: { id, ...(user?.role === UserRole.TEACHER ? { class: { teacherUserId: user.id } } : {}) }, include: { class: true, student: true, recordedByUser: { select: { id: true, name: true } }, correctedByUser: { select: { id: true, name: true } } } });
    if (!attendance && user?.role === UserRole.TEACHER) throw new ForbiddenException('Professor sem acesso a esta presença.');
    return attendance;
  }

  async create(dto: CreateAttendanceDto, user?: UserContext) {
    const attendanceDate = this.normalizedDate(dto.attendanceDate);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const actor = await this.activeActor(tx, user);
        const classRecord = await this.academicContext(tx, dto.classId, dto.studentId, actor);
        const created = await tx.attendance.create({ data: { ...dto, attendanceDate, recordedBy: actor.id }, include: { class: true, student: true } });
        await tx.auditLog.create({ data: { userId: actor.id, action: 'REGISTER', entity: 'Attendance', entityId: String(created.id), metadata: { operation: 'REGISTER', result: 'SUCCESS', attendanceId: created.id, studentId: dto.studentId, classId: dto.classId, modalityId: classRecord.modalityId, attendanceDate: attendanceDate.toISOString(), status: dto.status, actorId: actor.id } } });
        return created;
      }, { isolationLevel: 'Serializable' });
    } catch (error) { if (isDuplicate(error)) throw new ConflictException('Já existe presença para este aluno nesta turma e data.'); throw error; }
  }

  async createBatch(dto: CreateAttendanceBatchDto, user?: UserContext) {
    const attendanceDate = this.normalizedDate(dto.attendanceDate);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const actor = await this.activeActor(tx, user);
        let modalityId: number | undefined;
        for (const student of dto.students) modalityId = (await this.academicContext(tx, dto.classId, student.studentId, actor)).modalityId;
        const created = await tx.attendance.createMany({ data: dto.students.map((student) => ({ ...student, classId: dto.classId, attendanceDate, recordedBy: actor.id })) });
        await tx.auditLog.create({ data: { userId: actor.id, action: 'REGISTER_BATCH', entity: 'Attendance', metadata: { operation: 'REGISTER_BATCH', result: 'SUCCESS', classId: dto.classId, modalityId, studentIds: dto.students.map(({ studentId }) => studentId), attendanceDate: attendanceDate.toISOString(), processedStudents: created.count, actorId: actor.id } } });
        return { message: 'Presenças registradas com sucesso!', classId: dto.classId, attendanceDate: dto.attendanceDate, processedStudents: created.count };
      }, { isolationLevel: 'Serializable' });
    } catch (error) { if (isDuplicate(error)) throw new ConflictException('Alguns alunos já possuem presença registrada para esta turma e data.'); throw error; }
  }

  async update(id: number, dto: UpdateAttendanceDto, user?: UserContext) {
    return this.prisma.$transaction(async (tx) => {
      const actor = await this.activeActor(tx, user);
      const current = await tx.attendance.findUnique({ where: { id }, include: { class: { select: { modalityId: true } } } });
      if (!current) throw new NotFoundException('Registro de presença não encontrado.');
      const correctedAt = new Date();
      const updated = await tx.attendance.update({ where: { id }, data: { status: dto.status, notes: dto.notes, correctedBy: actor.id, correctedAt, correctionReason: dto.correctionReason }, include: { class: true, student: true } });
      await tx.auditLog.create({ data: { userId: actor.id, action: 'UPDATE', entity: 'Attendance', entityId: String(id), metadata: { operation: 'CORRECTION', result: 'SUCCESS', attendanceId: id, studentId: current.studentId, classId: current.classId, modalityId: current.class.modalityId, actorId: actor.id, correctedAt: correctedAt.toISOString(), correctionReason: dto.correctionReason, previous: { status: current.status, notes: current.notes }, current: { status: updated.status, notes: updated.notes } } } });
      return updated;
    }, { isolationLevel: 'Serializable' });
  }

  async remove(id: number): Promise<never> {
    const exists = await this.prisma.attendance.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Registro de presença não encontrado.');
    throw new ConflictException('Presenças compõem o histórico acadêmico e não podem ser excluídas; use a correção.');
  }
}
