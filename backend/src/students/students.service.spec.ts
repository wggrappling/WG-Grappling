import { StudentClassStatus, StudentModalityStatus, StudentPlanStatus, UserRole } from '../../generated/prisma/enums';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StudentsService } from './students.service';

describe('StudentsService', () => {
  describe('findAll', () => {
    it('aplica busca, filtros, ordenação e paginação no banco', async () => {
      const count = jest.fn();
      const findMany = jest.fn();
      const transaction = jest.fn().mockResolvedValue([21, [{ id: 1 }]]);
      const service = new StudentsService({ student: { count, findMany }, $transaction: transaction } as unknown as PrismaService);

      await expect(service.findAll(undefined, { search: 'Maria 123', status: 'ACTIVE', modalityId: 3, sortBy: 'joinedAt', sortOrder: 'desc', page: 2, pageSize: 10 } as never)).resolves.toMatchObject({ total: 21, page: 2, pageSize: 10, totalPages: 3 });
      expect(count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: 'ACTIVE', modalities: { some: { modalityId: 3, status: StudentModalityStatus.ACTIVE } } }) }));
      expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10, orderBy: { joinedAt: 'desc' } }));
    });

    it('restringe a listagem do professor às próprias turmas', async () => {
      const count = jest.fn(); const findMany = jest.fn();
      const service = new StudentsService({ student: { count, findMany }, $transaction: jest.fn().mockResolvedValue([0, []]) } as unknown as PrismaService);
      await service.findAll({ id: 9, role: UserRole.TEACHER });
      expect(count.mock.calls[0][0].where).toEqual({ studentClasses: { some: { status: StudentClassStatus.ACTIVE, class: { teacherUserId: 9 } } } });
    });
  });

  describe('findOne', () => {
    it('returns the student with the existing profile relationships', async () => {
      const student = {
        id: 7,
        person: { id: 3, address: null },
        responsibles: [],
        modalities: [],
        plans: [],
        studentClasses: [],
      };
      const findFirst = jest.fn().mockResolvedValue(student);
      const prisma = {
        student: { findFirst },
      } as unknown as PrismaService;
      const service = new StudentsService(prisma);

      await expect(service.findOne(7)).resolves.toBe(student);
      expect(findFirst).toHaveBeenCalledWith({
        where: { id: 7 },
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
    });

    it('preserves the existing null response when the student does not exist', async () => {
      const findFirst = jest.fn().mockResolvedValue(null);
      const prisma = {
        student: { findFirst },
      } as unknown as PrismaService;
      const service = new StudentsService(prisma);

      await expect(service.findOne(999)).resolves.toBeNull();
    });

    it('allows a teacher to access a student from their classes', async () => {
      const findFirst = jest.fn().mockResolvedValue({ id: 7, plans: [{ id: 11 }] });
      const service = new StudentsService({ student: { findFirst } } as unknown as PrismaService);
      await expect(service.findOne(7, { id: 4, role: UserRole.TEACHER })).resolves.toEqual({ id: 7, plans: [] });
      expect(findFirst.mock.calls[0][0].where).toEqual({ id: 7, studentClasses: { some: { status: StudentClassStatus.ACTIVE, class: { teacherUserId: 4 } } } });
    });

    it('rejects a teacher accessing a student outside their classes', async () => {
      const service = new StudentsService({ student: { findFirst: jest.fn().mockResolvedValue(null) } } as unknown as PrismaService);
      await expect(service.findOne(7, { id: 4, role: UserRole.TEACHER })).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('history', () => {
    const historyPrisma = (payments: any[]) => ({
      student: { findFirst: jest.fn().mockResolvedValue({ id: 7, joinedAt: new Date('2026-01-01T00:00:00Z') }) },
      graduation: { findMany: jest.fn().mockResolvedValue([]) },
      attendance: { findMany: jest.fn().mockResolvedValue([]) },
      document: { findMany: jest.fn().mockResolvedValue([]) },
      charge: { findMany: jest.fn().mockResolvedValue([{ id: 20, description: 'Mensalidade', status: 'PARTIALLY_PAID', createdAt: new Date('2026-01-02T00:00:00Z'), payments }]) },
      studentPlan: { findMany: jest.fn().mockResolvedValue([]) },
      studentClass: { findMany: jest.fn().mockResolvedValue([]) },
      studentModality: { findMany: jest.fn().mockResolvedValue([]) },
      auditLog: { findMany: jest.fn().mockResolvedValue([]) },
    }) as unknown as PrismaService;

    it('preserves normal and older payment events', async () => {
      const service = new StudentsService(historyPrisma([
        { id: 30, amount: 50, method: 'PIX', paidAt: new Date('2026-01-03T00:00:00Z'), refundedAt: null, refundReason: null, refundedByUser: null },
        { id: 31, amount: 25, method: 'CASH', paidAt: new Date('2026-01-04T00:00:00Z'), refundedAt: null, refundReason: null, refundedByUser: null },
      ]));

      const events = await service.history(7);
      expect(events.filter((event) => event.type === 'PAYMENT')).toHaveLength(2);
      expect(events.find((event) => event.id === 'payment-30')).toMatchObject({ type: 'PAYMENT', description: 'Pagamento registrado (PIX).' });
      expect(events.find((event) => event.id === 'enrollment-7')).toBeDefined();
    });

    it('represents a refunded payment once with value, charge, date, actor and reason', async () => {
      const refundedAt = new Date('2026-01-05T12:00:00Z');
      const service = new StudentsService(historyPrisma([
        { id: 30, amount: '50.00', method: 'PIX', paidAt: new Date('2026-01-03T00:00:00Z'), refundedAt, refundReason: 'Duplicidade', refundedByUser: { name: 'Administradora' } },
      ]));

      const events = await service.history(7);
      const paymentEvents = events.filter((event) => event.reference?.entity === 'Payment' && event.reference.id === 30);
      expect(paymentEvents).toHaveLength(1);
      expect(paymentEvents[0]).toMatchObject({ id: 'payment-refunded-30', type: 'PAYMENT_REFUNDED', date: refundedAt, actor: 'Administradora' });
      expect(paymentEvents[0].description).toContain('R$ 50.00');
      expect(paymentEvents[0].description).toContain('Mensalidade');
      expect(paymentEvents[0].description).toContain('Duplicidade');
    });

    it('does not expose financial or document history to teachers', async () => {
      const prisma = historyPrisma([]) as any;
      prisma.student.findFirst.mockResolvedValue({ id: 7, joinedAt: new Date('2026-01-01T00:00:00Z'), plans: [] });
      prisma.auditLog.findMany.mockResolvedValue([
        { id: 92, entity: 'StudentPlan', action: 'STUDENT_PLAN_CHANGED', entityId: '12', createdAt: new Date('2026-01-07'), user: { name: 'Admin' } },
        { id: 93, entity: 'Document', action: 'DELETE', entityId: '8', createdAt: new Date('2026-01-08'), user: { name: 'Admin' } },
      ]);
      const service = new StudentsService(prisma);

      const events = await service.history(7, { id: 4, role: UserRole.TEACHER });

      expect(events.map((event) => event.type)).toEqual(['ENROLLMENT']);
    });

    it('returns 404 when history is requested for a missing student', async () => {
      const prisma = historyPrisma([]) as any;
      prisma.student.findFirst.mockResolvedValue(null);
      const service = new StudentsService(prisma);

      await expect(service.history(999)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('includes document deletion and relevant administrative audit events', async () => {
      const prisma = historyPrisma([]) as any;
      prisma.document.findMany.mockResolvedValue([{ id: 8, status: 'DELETED', createdAt: new Date('2026-01-02'), originalName: 'contrato.pdf', uploader: { name: 'Ana' } }]);
      prisma.auditLog.findMany.mockResolvedValue([
        { id: 90, entity: 'Document', action: 'DELETE', entityId: '8', createdAt: new Date('2026-01-05'), user: { name: 'Admin' } },
        { id: 91, entity: 'Student', action: 'UPDATE', entityId: '7', createdAt: new Date('2026-01-06'), user: { name: 'Admin' } },
      ]);
      const events = await new StudentsService(prisma).history(7);
      expect(events).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'audit-90', type: 'DOCUMENT', description: 'Documento removido.' }),
        expect.objectContaining({ id: 'audit-91', type: 'ENROLLMENT_CHANGE', description: 'Dados do aluno atualizados.' }),
      ]));
      expect(events.find((event) => event.id === 'document-8')).toBeUndefined();
    });
  });

  describe('student lifecycle', () => {
    it.each(['ACTIVE', 'PAUSED', 'INACTIVE'] as const)('preserva vínculos ao alterar status para %s', async (status) => {
      const update = jest.fn().mockResolvedValue({ id: 7, status });
      const service = new StudentsService({ student: { update } } as unknown as PrismaService);
      await service.update(7, { status });
      expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 7 }, data: { status } }));
    });

    it('impede hard delete quando há histórico', async () => {
      const service = new StudentsService({ student: { findUnique: jest.fn().mockResolvedValue({ _count: { modalities: 1, plans: 0, attendances: 0, studentClasses: 0, charges: 0, responsibles: 0, documents: 0, graduations: 0 } }), delete: jest.fn() } } as unknown as PrismaService);
      await expect(service.remove(7)).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
