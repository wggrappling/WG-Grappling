import { AttendanceStatus, ChargeStatus, StudentStatus } from '../../generated/prisma/enums';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  const make = (overrides: Record<string, unknown> = {}) => {
    const prisma = {
      student: { count: jest.fn().mockResolvedValue(12) },
      charge: { count: jest.fn().mockResolvedValueOnce(4).mockResolvedValueOnce(2) },
      class: { findMany: jest.fn().mockResolvedValue([{ id: 1, name: 'No-Gi', startTime: '19:00', endTime: '20:00', modality: { name: 'Jiu-Jitsu' }, teacher: { name: 'Professor' } }]) },
      attendance: { groupBy: jest.fn().mockResolvedValue([
        { status: AttendanceStatus.PRESENT, _count: { _all: 8 } },
        { status: AttendanceStatus.ABSENT, _count: { _all: 2 } },
        { status: AttendanceStatus.JUSTIFIED, _count: { _all: 1 } },
      ]) },
      graduation: { findMany: jest.fn().mockResolvedValue([{ id: 5, belt: 'BLUE', graduatedAt: new Date('2026-08-16T00:00:00Z'), student: { person: { name: 'Aluno' } }, modality: { name: 'Jiu-Jitsu' } }]) },
      ...overrides,
    };
    return { prisma, service: new DashboardService(prisma as any) };
  };

  it('uses filtered counts for active students and financial status', async () => {
    const { prisma, service } = make();
    const result = await service.summary(new Date('2026-08-17T15:00:00Z'));
    expect(prisma.student.count).toHaveBeenCalledWith({ where: { status: StudentStatus.ACTIVE } });
    expect(prisma.charge.count).toHaveBeenNthCalledWith(1, { where: { status: ChargeStatus.PENDING } });
    expect(prisma.charge.count).toHaveBeenNthCalledWith(2, { where: { status: ChargeStatus.OVERDUE } });
    expect(result).toMatchObject({ activeStudents: 12, pendingCharges: 4, overdueCharges: 2 });
  });

  it('returns only safe fields for today classes', async () => {
    const { prisma, service } = make();
    const result = await service.summary(new Date('2026-08-17T15:00:00Z'));
    expect(prisma.class.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { active: true, weekDays: { has: 'MONDAY' } } }));
    expect(result.todayClasses[0]).toEqual({ id: 1, name: 'No-Gi', modality: 'Jiu-Jitsu', teacher: 'Professor', startTime: '19:00', endTime: '20:00' });
    expect(JSON.stringify(result)).not.toMatch(/password|token|cpf|email|database_url/i);
  });

  it('aggregates today attendance and limits recent graduations', async () => {
    const { prisma, service } = make();
    const result = await service.summary(new Date('2026-08-17T15:00:00Z'));
    expect(result.todayAttendance).toEqual({ present: 8, absent: 2, justified: 1 });
    expect(prisma.graduation.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5, orderBy: { graduatedAt: 'desc' } }));
    expect(result.recentGraduations[0]).toMatchObject({ student: 'Aluno', modality: 'Jiu-Jitsu', belt: 'BLUE' });
  });

  it('returns valid empty states without invented data', async () => {
    const { service } = make({
      student: { count: jest.fn().mockResolvedValue(0) },
      charge: { count: jest.fn().mockResolvedValue(0) },
      class: { findMany: jest.fn().mockResolvedValue([]) },
      attendance: { groupBy: jest.fn().mockResolvedValue([]) },
      graduation: { findMany: jest.fn().mockResolvedValue([]) },
    });
    await expect(service.summary(new Date('2026-08-17T15:00:00Z'))).resolves.toEqual({
      activeStudents: 0, pendingCharges: 0, overdueCharges: 0, todayClasses: [],
      todayAttendance: { present: 0, absent: 0, justified: 0 }, recentGraduations: [],
    });
  });
});
