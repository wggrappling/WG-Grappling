import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentModalityStatus, StudentPlanStatus, UserRole } from '../../generated/prisma/enums';
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
      ...(user?.role === UserRole.TEACHER ? { studentClasses: { some: { class: { teacherUserId: user.id } } } } : {}),
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
      where: { id, ...(user?.role === UserRole.TEACHER ? { studentClasses: { some: { class: { teacherUserId: user.id } } } } : {}) },
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
      },
    });
    if (!student && user?.role === UserRole.TEACHER) throw new ForbiddenException('Professor sem acesso a este aluno.');
    if (!student) return null;
    return student;
  }

  async create(createStudentDto: CreateStudentDto) {
    return await this.prisma.student.create({
      data: createStudentDto,
      include: { person: true },
    });
  }

  async history(id: number, user?: UserContext) {
    const student = await this.findOne(id, user); if (!student) throw new Error('Aluno não encontrado.');
    const [graduations, attendances, documents, charges, plans] = await Promise.all([
      this.prisma.graduation.findMany({ where: { studentId: id }, include: { modality: { select: { name: true } }, actor: { select: { name: true } } } }),
      this.prisma.attendance.findMany({ where: { studentId: id }, include: { class: { select: { name: true } } } }),
      this.prisma.document.findMany({ where: { studentId: id, status: { not: 'DELETED' } }, include: { uploader: { select: { name: true } } } }),
      this.prisma.charge.findMany({
        where: { studentId: id },
        include: { payments: { include: { refundedByUser: { select: { name: true } } } } },
      }),
      this.prisma.studentPlan.findMany({ where: { studentId: id }, include: { plan: { select: { name: true } } } }),
    ]);
    const events:any[]=[{id:`enrollment-${id}`,type:'ENROLLMENT',date:student.joinedAt,description:'Matrícula do aluno registrada.',actor:null,reference:{entity:'Student',id}}];
    graduations.forEach(g=>events.push({id:`graduation-${g.id}`,type:'GRADUATION',date:g.graduatedAt,description:`Graduação ${g.belt} registrada em ${g.modality.name}.`,actor:g.actor?.name??null,reference:{entity:'Graduation',id:g.id}}));
    attendances.forEach(a=>events.push({id:`attendance-${a.id}`,type:'ATTENDANCE',date:a.attendanceDate,description:`Presença ${a.status} em ${a.class.name}.`,actor:null,reference:{entity:'Attendance',id:a.id}}));
    documents.forEach(d=>events.push({id:`document-${d.id}`,type:'DOCUMENT',date:d.createdAt,description:`Documento ${d.originalName} registrado.`,actor:d.uploader?.name??null,reference:{entity:'Document',id:d.id}}));
    charges.forEach(c=>{
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
    plans.forEach(p=>events.push({id:`plan-${p.id}`,type:'ENROLLMENT_CHANGE',date:p.createdAt,description:`Plano ${p.plan.name} vinculado (${p.status}).`,actor:null,reference:{entity:'StudentPlan',id:p.id}}));
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
    await this.prisma.student.delete({
      where: { id },
    });

    return {
      message: 'Estudante removido com sucesso!',
    };
  }
}
