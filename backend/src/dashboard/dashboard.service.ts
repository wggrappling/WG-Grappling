import { Injectable } from '@nestjs/common';
import { AttendanceStatus, ChargeStatus, StudentStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

const weekDay = (date: Date) => new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  timeZone: 'America/Sao_Paulo',
}).format(date).toUpperCase();

const utcDayBounds = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const start = new Date(`${value.year}-${value.month}-${value.day}T00:00:00.000Z`);
  const end = new Date(`${value.year}-${value.month}-${value.day}T23:59:59.999Z`);
  return { start, end };
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(now = new Date()) {
    const day = weekDay(now);
    const { start, end } = utcDayBounds(now);
    const [activeStudents, pendingCharges, overdueCharges, todayClasses, attendanceGroups, recentGraduations] = await Promise.all([
      this.prisma.student.count({ where: { status: StudentStatus.ACTIVE } }),
      this.prisma.charge.count({ where: { status: ChargeStatus.PENDING } }),
      this.prisma.charge.count({ where: { status: ChargeStatus.OVERDUE } }),
      this.prisma.class.findMany({
        where: { active: true, weekDays: { has: day } },
        orderBy: { startTime: 'asc' },
        select: {
          id: true, name: true, startTime: true, endTime: true,
          modality: { select: { name: true } },
          teacher: { select: { name: true } },
        },
      }),
      this.prisma.attendance.groupBy({
        by: ['status'], where: { attendanceDate: { gte: start, lte: end } }, _count: { _all: true },
      }),
      this.prisma.graduation.findMany({
        orderBy: { graduatedAt: 'desc' }, take: 5,
        select: {
          id: true, belt: true, graduatedAt: true,
          student: { select: { person: { select: { name: true } } } },
          modality: { select: { name: true } },
        },
      }),
    ]);

    const attendance = { present: 0, absent: 0, justified: 0 };
    for (const group of attendanceGroups) {
      if (group.status === AttendanceStatus.PRESENT) attendance.present = group._count._all;
      if (group.status === AttendanceStatus.ABSENT) attendance.absent = group._count._all;
      if (group.status === AttendanceStatus.JUSTIFIED) attendance.justified = group._count._all;
    }

    return {
      activeStudents,
      pendingCharges,
      overdueCharges,
      todayClasses: todayClasses.map((item) => ({
        id: item.id, name: item.name, modality: item.modality.name, teacher: item.teacher.name,
        startTime: item.startTime, endTime: item.endTime,
      })),
      todayAttendance: attendance,
      recentGraduations: recentGraduations.map((item) => ({
        id: item.id, student: item.student.person.name, modality: item.modality.name,
        belt: item.belt, graduatedAt: item.graduatedAt,
      })),
    };
  }
}
