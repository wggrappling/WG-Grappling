import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentClassStatus, StudentModalityStatus, StudentPlanStatus, UserRole } from '../../generated/prisma/enums';
import { Prisma } from '../../generated/prisma/client';
import { StudentQueryDto } from './dto/student-query.dto';

type UserContext = { id: number; role: UserRole };

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user?: UserContext, query: StudentQueryDto = new StudentQueryDto()) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const search = query.search?.trim();
    const where: Prisma.StudentWhereInput = {
      ...(user?.role === UserRole.TEACHER ? { studentClasses: { some: { status: StudentClassStatus.ACTIVE, class: { teacherUserId: user.id } } } } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.modalityId ? { modalities: { some: { modalityId: query.modalityId, status: StudentModalityStatus.ACTIVE } } } : {}),
      ...(search ? { OR: [
        { enrollmentNumber: { contains: search, mode: 'insensitive' } },
        { person: { name: { contains: search, mode: 'insensitive' } } },
        { person: { cpf: { contains: search.replace(/\D/g, '') } } },
      ] } : {}),
    };
    const orderBy: Prisma.StudentOrderByWithRelationInput = query.sortBy === 'name'
      ? { person: { name: query.sortOrder ?? 'asc' } }
      : { [query.sortBy ?? 'joinedAt']: query.sortOrder ?? 'asc' };
    const [total, students] = await this.prisma.$transaction([
      this.prisma.student.count({ where }),
      this.prisma.student.findMany({
        where, orderBy, skip: (page - 1) * pageSize, take: pageSize,
        include: { person: true, modalities: { where: { status: StudentModalityStatus.ACTIVE }, include: { modality: true } } },
      }),
    ]);
    return {
      module: 'Students',
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      data: students,
    };
  }

  async findOne(id: number, user?: UserContext) {
    const student = await this.prisma.student.findFirst({
      where: { id, ...(user?.role === UserRole.TEACHER ? { studentClasses: { some: { status: StudentClassStatus.ACTIVE, class: { teacherUserId: user.id } } } } : {}) },
      include: {
        person: {
          include: { address: true },
        },
        responsibles: {
          include: { responsible: true },
        },
        modalities: { include: { modality: true } },
        plans: {
          where: { status: StudentPlanStatus.ACTIVE },
          include: { plan: true },
        },
        studentClasses: {
          where: { status: StudentClassStatus.ACTIVE },
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
        graduations: {
          include: { modality: true, actor: { select: { id: true, name: true } } },
          orderBy: [{ modalityId: 'asc' }, { graduatedAt: 'desc' }],
        },
      },
    });
    if (!student && user?.role === UserRole.TEACHER) throw new ForbiddenException('Professor sem acesso a este aluno.');
    if (!student) return null;
    if (user?.role === UserRole.TEACHER) return { ...student, plans: [] };
    return student;
  }

  async create(createStudentDto: CreateStudentDto) {
    return await this.prisma.student.create({
      data: createStudentDto,
      include: { person: true },
    });
  }

  async history(id: number, user?: UserContext) {
    const student = await this.findOne(id, user);
    if (!student) throw new NotFoundException('Aluno não encontrado.');
    const canAccessSensitiveHistory = user?.role !== UserRole.TEACHER;
    const [graduations, attendances, documents, charges, plans, classMemberships, modalityPeriods] = await Promise.all([
      this.prisma.graduation.findMany({ where: { studentId: id }, include: { modality: { select: { name: true } }, actor: { select: { name: true } } } }),
      this.prisma.attendance.findMany({ where: { studentId: id }, include: { class: { select: { name: true } } } }),
      this.prisma.document.findMany({ where: { studentId: id }, include: { uploader: { select: { name: true } } } }),
      this.prisma.charge.findMany({
        where: { studentId: id },
        include: { payments: { include: { refundedByUser: { select: { name: true } } } } },
      }),
      this.prisma.studentPlan.findMany({ where: { studentId: id }, include: { plan: { select: { name: true } } } }),
      this.prisma.studentClass.findMany({ where: { studentId: id }, include: { class: { select: { name: true } } } }),
      this.prisma.studentModality.findMany({ where: { studentId: id }, include: { modality: { select: { name: true } } } }),
    ]);
    const relatedAuditTargets = [
      { entity: 'Student', ids: [id] },
      { entity: 'Enrollment', ids: [id] },
      { entity: 'Document', ids: documents.map((item) => item.id) },
      { entity: 'Graduation', ids: graduations.map((item) => item.id) },
      { entity: 'Attendance', ids: attendances.map((item) => item.id) },
      { entity: 'StudentPlan', ids: plans.map((item) => item.id) },
    ];
    const auditLogs = await this.prisma.auditLog.findMany({
      where: { OR: relatedAuditTargets.filter((target) => target.ids.length).map((target) => ({ entity: target.entity, entityId: { in: target.ids.map(String) } })) },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const events:any[]=[{id:`enrollment-${id}`,type:'ENROLLMENT',date:student.joinedAt,description:'Matrícula do aluno registrada.',actor:null,reference:{entity:'Student',id}}];
    graduations.forEach(g=>events.push({id:`graduation-${g.id}`,type:'GRADUATION',date:g.graduatedAt,description:`Graduação ${g.belt} registrada em ${g.modality.name}.`,actor:g.actor?.name??null,reference:{entity:'Graduation',id:g.id}}));
    attendances.forEach(a=>events.push({id:`attendance-${a.id}`,type:'ATTENDANCE',date:a.attendanceDate,description:`Presença ${a.status} em ${a.class.name}.`,actor:null,reference:{entity:'Attendance',id:a.id}}));
    if (canAccessSensitiveHistory) documents.filter((document) => document.status !== 'DELETED').forEach(d=>events.push({id:`document-${d.id}`,type:'DOCUMENT',date:d.createdAt,description:`Documento ${d.originalName} registrado.`,actor:d.uploader?.name??null,reference:{entity:'Document',id:d.id}}));
    if (canAccessSensitiveHistory) charges.forEach(c=>{
      events.push({id:`charge-${c.id}`,type:'CHARGE',date:c.createdAt,description:`Cobrança: ${c.description} (${c.status}).`,actor:null,reference:{entity:'Charge',id:c.id}});
      c.payments.forEach(p=>{
        if (p.refundedAt) {
          const reason = p.refundReason ? ` Motivo: ${p.refundReason}.` : '';
          events.push({id:`payment-refunded-${p.id}`,type:'PAYMENT_REFUNDED',date:p.refundedAt,description:`Estorno de pagamento no valor de R$ ${p.amount} da cobrança ${c.description}.${reason}`,actor:p.refundedByUser?.name??null,reference:{entity:'Payment',id:p.id}});
          return;
        }
        events.push({id:`payment-${p.id}`,type:'PAYMENT',date:p.paidAt,description:`Pagamento registrado (${p.method}).`,actor:null,reference:{entity:'Payment',id:p.id}});
      });
    });
    if (canAccessSensitiveHistory) plans.forEach(p=>events.push({id:`plan-${p.id}`,type:'ENROLLMENT_CHANGE',date:p.createdAt,description:`Plano ${p.plan.name} vinculado (${p.status}).`,actor:null,reference:{entity:'StudentPlan',id:p.id}}));
    classMemberships.forEach((membership) => {
      events.push({ id: `class-joined-${membership.id}`, type: 'CLASS', date: membership.joinedAt, description: `Entrada na turma ${membership.class.name}.`, actor: null, reference: { entity: 'StudentClass', id: membership.id } });
      if (membership.leftAt) events.push({ id: `class-left-${membership.id}`, type: 'CLASS', date: membership.leftAt, description: `Saída da turma ${membership.class.name}.`, actor: null, reference: { entity: 'StudentClass', id: membership.id } });
    });
    modalityPeriods.forEach((period) => {
      events.push({ id: `modality-started-${period.id}`, type: 'MODALITY', date: period.startedAt, description: `Início na modalidade ${period.modality.name}.`, actor: null, reference: { entity: 'StudentModality', id: period.id } });
      if (period.pausedAt) events.push({ id: `modality-paused-${period.id}`, type: 'MODALITY', date: period.pausedAt, description: `Modalidade ${period.modality.name} pausada.`, actor: null, reference: { entity: 'StudentModality', id: period.id } });
      if (period.resumedAt) events.push({ id: `modality-resumed-${period.id}`, type: 'MODALITY', date: period.resumedAt, description: `Modalidade ${period.modality.name} retomada.`, actor: null, reference: { entity: 'StudentModality', id: period.id } });
      if (period.finishedAt) events.push({ id: `modality-finished-${period.id}`, type: 'MODALITY', date: period.finishedAt, description: `Modalidade ${period.modality.name} finalizada.`, actor: null, reference: { entity: 'StudentModality', id: period.id } });
    });
    const auditDescriptions: Record<string, { type: string; description: string; sensitive?: boolean }> = {
      'Student:UPDATE': { type: 'ENROLLMENT_CHANGE', description: 'Dados do aluno atualizados.' },
      'Enrollment:UPDATE': { type: 'ENROLLMENT_CHANGE', description: 'Matrícula do aluno atualizada.' },
      'Document:DELETE': { type: 'DOCUMENT', description: 'Documento removido.', sensitive: true },
      'Graduation:UPDATE': { type: 'GRADUATION', description: 'Graduação atualizada.' },
      'Attendance:UPDATE': { type: 'ATTENDANCE', description: 'Presença atualizada.' },
      'Attendance:DELETE': { type: 'ATTENDANCE', description: 'Presença removida.' },
      'StudentPlan:STUDENT_PLAN_CREATED': { type: 'ENROLLMENT_CHANGE', description: 'Plano do aluno criado.', sensitive: true },
      'StudentPlan:STUDENT_PLAN_CHANGED': { type: 'ENROLLMENT_CHANGE', description: 'Plano do aluno alterado.', sensitive: true },
      'StudentPlan:STUDENT_PLAN_TERMS_UPDATED': { type: 'ENROLLMENT_CHANGE', description: 'Condições do plano atualizadas.', sensitive: true },
      'StudentPlan:STUDENT_PLAN_ENDED': { type: 'ENROLLMENT_CHANGE', description: 'Plano do aluno encerrado.', sensitive: true },
    };
    auditLogs.forEach((log) => {
      const presentation = auditDescriptions[`${log.entity}:${log.action}`];
      if (!presentation || (presentation.sensitive && !canAccessSensitiveHistory)) return;
      events.push({ id: `audit-${log.id}`, type: presentation.type, date: log.createdAt, description: presentation.description, actor: log.user?.name ?? null, reference: { entity: log.entity, id: log.entityId } });
    });
    return events.sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime());
  }

  async update(id: number, updateStudentDto: UpdateStudentDto) {
    return await this.prisma.student.update({
      where: { id },
      data: updateStudentDto,
      include: { person: true },
    });
  }

  async remove(id: number) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: {
        _count: { select: { modalities: true, plans: true, attendances: true, studentClasses: true, charges: true, responsibles: true, documents: true, graduations: true } },
      },
    });
    if (!student) throw new NotFoundException('Aluno não encontrado.');
    if (Object.values(student._count).some((count) => count > 0)) {
      throw new ConflictException('Aluno com histórico não pode ser excluído; altere o status para INACTIVE.');
    }
    await this.prisma.student.delete({
      where: { id },
    });

    return {
      message: 'Estudante removido com sucesso!',
    };
  }
}
