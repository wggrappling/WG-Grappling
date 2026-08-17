import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceReportQueryDto, FinancialReportQueryDto, GraduationReportQueryDto, PaginationDto, StudentReportQueryDto } from './dto/report-query.dto';

const pageData = (query: PaginationDto) => ({ page: query.page ?? 1, pageSize: Math.min(query.pageSize ?? 20, 100) });
const period = (from?: string, to?: string) => {
  const start = from ? new Date(from) : undefined;
  const end = to ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(to) ? `${to}T23:59:59.999Z` : to) : undefined;
  if (start && end && start > end) throw new BadRequestException('O início do período deve ser anterior ou igual ao fim.');
  return start || end ? { gte: start, lte: end } : undefined;
};
const response = <T>(data: T[], total: number, page: number, pageSize: number) => ({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async students(query: StudentReportQueryDto) {
    const { page, pageSize } = pageData(query);
    const joinedAt = period(query.joinedFrom, query.joinedTo);
    const where: Prisma.StudentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.modalityId ? { modalities: { some: { modalityId: query.modalityId, status: 'ACTIVE' } } } : {}),
      ...(joinedAt ? { joinedAt } : {}),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.student.count({ where }),
      this.prisma.student.findMany({ where, orderBy: { joinedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, select: {
        id: true, enrollmentNumber: true, status: true, joinedAt: true,
        person: { select: { name: true } },
        modalities: { where: { status: 'ACTIVE' }, select: { modality: { select: { name: true } } } },
      } }),
    ]);
    return response(rows.map((row) => ({ id: row.id, name: row.person.name, enrollmentNumber: row.enrollmentNumber, status: row.status, joinedAt: row.joinedAt, modalities: row.modalities.map((item) => item.modality.name) })), total, page, pageSize);
  }

  async financial(query: FinancialReportQueryDto) {
    const { page, pageSize } = pageData(query);
    const dueDate = period(query.dueFrom, query.dueTo);
    const where: Prisma.ChargeWhereInput = { ...(query.status ? { status: query.status } : {}), ...(dueDate ? { dueDate } : {}) };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.charge.count({ where }),
      this.prisma.charge.findMany({ where, orderBy: { dueDate: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, select: {
        id: true, referenceMonth: true, finalAmount: true, dueDate: true, status: true,
        student: { select: { person: { select: { name: true } } } },
        payments: { where: { refundedAt: null }, select: { amount: true } },
      } }),
    ]);
    const data = rows.map((row) => {
      const totalPaid = row.payments.reduce((sum, item) => sum.plus(item.amount), new Prisma.Decimal(0));
      const amount = new Prisma.Decimal(row.finalAmount);
      return { id: row.id, referenceMonth: row.referenceMonth, student: row.student.person.name, amount: amount.toNumber(), dueDate: row.dueDate, status: row.status, totalPaid: totalPaid.toNumber(), balance: Prisma.Decimal.max(0, amount.minus(totalPaid)).toNumber() };
    });
    return response(data, total, page, pageSize);
  }

  async attendance(query: AttendanceReportQueryDto) {
    const { page, pageSize } = pageData(query);
    const attendanceDate = period(query.dateFrom, query.dateTo);
    const where: Prisma.AttendanceWhereInput = { ...(query.classId ? { classId: query.classId } : {}), ...(query.studentId ? { studentId: query.studentId } : {}), ...(query.studentName?.trim() ? { student: { person: { name: { contains: query.studentName.trim(), mode: 'insensitive' } } } } : {}), ...(query.status ? { status: query.status } : {}), ...(attendanceDate ? { attendanceDate } : {}) };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.attendance.count({ where }),
      this.prisma.attendance.findMany({ where, orderBy: { attendanceDate: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, select: {
        id: true, attendanceDate: true, status: true,
        student: { select: { person: { select: { name: true } } } }, class: { select: { name: true } },
      } }),
    ]);
    return response(rows.map((row) => ({ id: row.id, student: row.student.person.name, class: row.class.name, date: row.attendanceDate, status: row.status })), total, page, pageSize);
  }

  async graduations(query: GraduationReportQueryDto) {
    const { page, pageSize } = pageData(query);
    const graduatedAt = period(query.dateFrom, query.dateTo);
    const where: Prisma.GraduationWhereInput = { ...(query.modalityId ? { modalityId: query.modalityId } : {}), ...(query.belt ? { belt: query.belt } : {}), ...(graduatedAt ? { graduatedAt } : {}) };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.graduation.count({ where }),
      this.prisma.graduation.findMany({ where, orderBy: { graduatedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, select: {
        id: true, belt: true, graduatedAt: true, student: { select: { person: { select: { name: true } } } },
        modality: { select: { name: true } }, actor: { select: { name: true } },
      } }),
    ]);
    return response(rows.map((row) => ({ id: row.id, student: row.student.person.name, modality: row.modality.name, belt: row.belt, date: row.graduatedAt, actor: row.actor?.name ?? null })), total, page, pageSize);
  }
}
