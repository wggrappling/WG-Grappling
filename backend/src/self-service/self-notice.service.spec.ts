import { NotFoundException } from '@nestjs/common';
import { StudentStatus, UserRole } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { SelfServiceCapability } from './context/student-access.policy';
import { SelfNoticeService } from './self-notice.service';

describe('SelfNoticeService', () => {
  const prisma = {
    notice: { findMany: jest.fn(), findFirst: jest.fn() },
    noticeRead: { upsert: jest.fn() },
  };
  const service = new SelfNoticeService(prisma as unknown as PrismaService);
  const context = {
    userId: 7,
    role: UserRole.ALUNO,
    studentId: 41,
    studentStatus: StudentStatus.ACTIVE,
    capabilities: [SelfServiceCapability.READ, SelfServiceCapability.OPERATE],
  } as const;

  beforeEach(() => jest.clearAllMocks());

  it('filters all recipient scopes server-side and returns a closed projection', async () => {
    prisma.notice.findMany.mockResolvedValueOnce([{
      id: 2, title: 'Horário', content: 'Novo horário', publishedAt: new Date('2026-08-28T12:00:00Z'),
      reads: [], authorId: 99, createdAt: new Date(),
    }]).mockResolvedValueOnce([]);

    await expect(service.getNotices(context)).resolves.toEqual([{
      id: 2, title: 'Horário', content: 'Novo horário', publishedAt: new Date('2026-08-28T12:00:00Z'), isRead: false,
    }]);
    const call = prisma.notice.findMany.mock.calls[0][0];
    expect(call.where.AND[0].OR).toEqual(expect.arrayContaining([
      expect.objectContaining({ studentRecipients: { some: { studentId: 41 } } }),
    ]));
    expect(call.select).toEqual({ id: true, title: true, content: true, publishedAt: true, reads: { where: { studentId: 41 }, select: { readAt: true } } });
    expect(call.take).toBe(200);
  });

  it('orders unread first while retaining publication order within each state', async () => {
    prisma.notice.findMany.mockResolvedValueOnce([
      { id: 2, title: 'Novo não lido', content: 'B', publishedAt: new Date('2026-08-27'), reads: [] },
      { id: 1, title: 'Antigo não lido', content: 'A', publishedAt: new Date('2026-08-26'), reads: [] },
    ]).mockResolvedValueOnce([
      { id: 3, title: 'Mais novo lido', content: 'C', publishedAt: new Date('2026-08-28'), reads: [{ readAt: new Date() }] },
    ]);
    const result = await service.getNotices(context);
    expect(result.map(({ id }) => id)).toEqual([2, 1, 3]);
  });

  it('blocks detail IDOR with the authenticated student visibility predicate', async () => {
    prisma.notice.findFirst.mockResolvedValue(null);
    await expect(service.getNotice(context, 500)).rejects.toThrow(NotFoundException);
    expect(prisma.notice.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 500, OR: expect.any(Array) }),
    }));
  });

  it('records an individual, idempotent read only after ownership validation', async () => {
    prisma.notice.findFirst.mockResolvedValue({ id: 4, title: 'Graduação', content: 'Data', publishedAt: new Date(), reads: [] });
    prisma.noticeRead.upsert.mockResolvedValue({});
    await expect(service.markRead(context, 4)).resolves.toEqual(expect.objectContaining({ id: 4, isRead: true }));
    expect(prisma.noticeRead.upsert).toHaveBeenCalledWith({
      where: { noticeId_studentId: { noticeId: 4, studentId: 41 } },
      create: { noticeId: 4, studentId: 41 },
      update: {},
    });
  });

  it('does not create a read receipt for another student notice', async () => {
    prisma.notice.findFirst.mockResolvedValue(null);
    await expect(service.markRead(context, 700)).rejects.toThrow(NotFoundException);
    expect(prisma.noticeRead.upsert).not.toHaveBeenCalled();
  });

  it('allows PAUSED context to read its own notice', async () => {
    const paused = { ...context, studentStatus: StudentStatus.PAUSED, capabilities: [SelfServiceCapability.READ] } as const;
    prisma.notice.findFirst.mockResolvedValue({ id: 5, title: 'Geral', content: 'Comunicado', publishedAt: new Date(), reads: [] });
    prisma.noticeRead.upsert.mockResolvedValue({});
    await expect(service.markRead(paused, 5)).resolves.toEqual(expect.objectContaining({ isRead: true }));
  });
});
