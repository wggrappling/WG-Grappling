import { ChargeStatus, StudentStatus } from '../../generated/prisma/enums';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const make = () => {
    const prisma = {
      student: { count: jest.fn().mockResolvedValue(1), findMany: jest.fn().mockResolvedValue([{ id: 1, enrollmentNumber: 'WG-1', status: 'ACTIVE', joinedAt: new Date('2026-01-10'), person: { name: 'Ana' }, modalities: [{ modality: { name: 'Jiu-Jitsu' } }] }]) },
      charge: { count: jest.fn().mockResolvedValue(1), findMany: jest.fn().mockResolvedValue([{ id: 2, referenceMonth: '2026-01', finalAmount: 100, dueDate: new Date('2026-01-10'), status: 'PARTIALLY_PAID', student: { person: { name: 'Ana' } }, payments: [{ amount: 40 }] }]) },
      attendance: { count: jest.fn().mockResolvedValue(1), findMany: jest.fn().mockResolvedValue([{ id: 3, attendanceDate: new Date('2026-01-10'), status: 'PRESENT', student: { person: { name: 'Ana' } }, class: { name: 'Manhã' } }]) },
      graduation: { count: jest.fn().mockResolvedValue(1), findMany: jest.fn().mockResolvedValue([{ id: 4, belt: 'BLUE', graduatedAt: new Date('2026-01-10'), student: { person: { name: 'Ana' } }, modality: { name: 'Jiu-Jitsu' }, actor: { name: 'Admin' } }]) },
      $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
    };
    return { prisma, service: new ReportsService(prisma as any) };
  };

  describe('students', () => {
    it('filters by status, modality and joined period', async () => {
      const { prisma, service } = make();
      await service.students({ status: StudentStatus.ACTIVE, modalityId: 7, joinedFrom: '2026-01-01', joinedTo: '2026-01-31', page: 1, pageSize: 20 });
      expect(prisma.student.count).toHaveBeenCalledWith({ where: expect.objectContaining({ status: StudentStatus.ACTIVE, modalities: { some: { modalityId: 7, status: 'ACTIVE' } }, joinedAt: expect.any(Object) }) });
    });
    it('paginates and returns only report fields', async () => {
      const { prisma, service } = make(); const result = await service.students({ page: 2, pageSize: 10 });
      expect(prisma.student.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
      expect(result.data[0]).toEqual({ id: 1, name: 'Ana', enrollmentNumber: 'WG-1', status: 'ACTIVE', joinedAt: expect.any(Date), modalities: ['Jiu-Jitsu'] });
    });
  });

  describe('financial', () => {
    it('filters by due period and charge status', async () => {
      const { prisma, service } = make();
      await service.financial({ status: ChargeStatus.PAID, dueFrom: '2026-01-01', dueTo: '2026-01-31', page: 1, pageSize: 20 });
      expect(prisma.charge.count).toHaveBeenCalledWith({ where: expect.objectContaining({ status: ChargeStatus.PAID, dueDate: expect.any(Object) }) });
    });
    it('selects only non-refunded payments and calculates paid amount and balance', async () => {
      const { prisma, service } = make(); const result = await service.financial({ page: 1, pageSize: 20 });
      expect(prisma.charge.findMany.mock.calls[0][0].select.payments.where).toEqual({ refundedAt: null });
      expect(result.data[0]).toMatchObject({ amount: 100, totalPaid: 40, balance: 60 });
    });
    it('paginates financial rows', async () => {
      const { prisma, service } = make(); await service.financial({ page: 3, pageSize: 5 });
      expect(prisma.charge.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 5 }));
    });
  });

  describe('attendance', () => {
    it('filters by period, class and student', async () => {
      const { prisma, service } = make();
      await service.attendance({ classId: 2, studentId: 3, dateFrom: '2026-01-01', dateTo: '2026-01-31', page: 1, pageSize: 20 });
      expect(prisma.attendance.count).toHaveBeenCalledWith({ where: expect.objectContaining({ classId: 2, studentId: 3, attendanceDate: expect.any(Object) }) });
    });
    it('paginates attendance rows', async () => {
      const { prisma, service } = make(); await service.attendance({ page: 2, pageSize: 7 });
      expect(prisma.attendance.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 7, take: 7 }));
    });
  });

  describe('graduations', () => {
    it('filters by modality, belt and period', async () => {
      const { prisma, service } = make();
      await service.graduations({ modalityId: 4, belt: 'BLUE', dateFrom: '2026-01-01', dateTo: '2026-01-31', page: 1, pageSize: 20 } as any);
      expect(prisma.graduation.count).toHaveBeenCalledWith({ where: expect.objectContaining({ modalityId: 4, belt: 'BLUE', graduatedAt: expect.any(Object) }) });
    });
    it('paginates graduation rows', async () => {
      const { prisma, service } = make(); await service.graduations({ page: 4, pageSize: 5 });
      expect(prisma.graduation.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 15, take: 5 }));
    });
  });

  it('caps pageSize at 100 and returns no sensitive data', async () => {
    const { prisma, service } = make(); const result = await service.students({ page: 1, pageSize: 999 });
    expect(prisma.student.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
    expect(result.pageSize).toBe(100);
    expect(JSON.stringify(result)).not.toMatch(/password|token|jwt|cpf|database_url/i);
  });
});
