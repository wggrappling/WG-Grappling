import { StudentClassStatus, StudentStatus, UserRole } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { SelfServiceCapability } from './context/student-access.policy';
import { SelfScheduleService } from './self-schedule.service';

describe('SelfScheduleService', () => {
  const prisma = { studentClass: { findMany: jest.fn() } };
  const service = new SelfScheduleService(prisma as unknown as PrismaService);
  const context = {
    userId: 7, role: UserRole.ALUNO, studentId: 41, studentStatus: StudentStatus.ACTIVE,
    capabilities: [SelfServiceCapability.READ, SelfServiceCapability.OPERATE],
  } as const;

  beforeEach(() => jest.clearAllMocks());

  it('derives next and upcoming classes from owned active recurring memberships', async () => {
    prisma.studentClass.findMany.mockResolvedValue([
      { class: { name: 'No-Gi', weekDays: ['MONDAY', 'WEDNESDAY'], startTime: '19:00', endTime: '20:00', modality: { name: 'Jiu-Jitsu' }, teacher: { email: 'hidden' } } },
      { class: { name: 'Fundamentos', weekDays: ['MONDAY'], startTime: '18:00', endTime: '19:00', modality: { name: 'Jiu-Jitsu' } } },
    ]);
    const result = await service.getSchedule(context, new Date('2026-08-31T10:00:00.000Z'));
    expect(result.next).toEqual({ date: '2026-08-31', startTime: '18:00', endTime: '19:00', className: 'Fundamentos', modalityName: 'Jiu-Jitsu' });
    expect(result.upcoming[0]).toEqual({ date: '2026-08-31', startTime: '19:00', endTime: '20:00', className: 'No-Gi', modalityName: 'Jiu-Jitsu' });
    expect(prisma.studentClass.findMany).toHaveBeenCalledWith({
      where: { studentId: 41, status: StudentClassStatus.ACTIVE, class: { active: true } },
      select: { class: { select: { name: true, weekDays: true, startTime: true, endTime: true, modality: { select: { name: true } } } } },
    });
    expect(JSON.stringify(result)).not.toMatch(/studentId|userId|classId|teacher|email|attendance/i);
  });

  it('does not return a class occurrence whose start time has passed today', async () => {
    prisma.studentClass.findMany.mockResolvedValue([{ class: { name: 'Manhã', weekDays: ['MONDAY'], startTime: '09:00', endTime: '10:00', modality: { name: 'Judô' } } }]);
    const result = await service.getSchedule(context, new Date('2026-08-31T10:00:00.000Z'));
    expect(result.next?.date).toBe('2026-09-07');
  });

  it('orders occurrences and limits the projection to fourteen', async () => {
    prisma.studentClass.findMany.mockResolvedValue([{ class: { name: 'Diária', weekDays: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'], startTime: '19:00', endTime: '20:00', modality: { name: 'Jiu-Jitsu' } } }]);
    const result = await service.getSchedule(context, new Date('2026-08-31T10:00:00.000Z'));
    expect([result.next, ...result.upcoming]).toHaveLength(14);
    expect(result.next?.date).toBe('2026-08-31');
    expect(result.upcoming.at(-1)?.date).toBe('2026-09-13');
  });

  it('returns an explicit empty projection when there are no eligible classes', async () => {
    prisma.studentClass.findMany.mockResolvedValue([]);
    await expect(service.getSchedule(context, new Date('2026-08-31T10:00:00.000Z'))).resolves.toEqual({ next: null, upcoming: [] });
  });

  it('allows PAUSED to consult only memberships resolved from its context', async () => {
    const paused = { ...context, studentStatus: StudentStatus.PAUSED, capabilities: [SelfServiceCapability.READ] } as const;
    prisma.studentClass.findMany.mockResolvedValue([]);
    await service.getSchedule(paused, new Date('2026-08-31T10:00:00.000Z'));
    expect(prisma.studentClass.findMany.mock.calls[0][0].where.studentId).toBe(41);
  });
});
