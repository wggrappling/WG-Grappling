import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AttendanceStatus, UserRole } from '../../generated/prisma/enums';
import { AttendanceService } from './attendance.service';

describe('AttendanceService', () => {
  const tx = { attendance: { createMany: jest.fn() } };
  const prisma = {
    attendance: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    class: { findFirst: jest.fn(), findUnique: jest.fn() },
    student: { findUnique: jest.fn() },
    studentClass: { findMany: jest.fn(), findFirst: jest.fn() },
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const service = new AttendanceService(prisma as never);
  const teacher = { id: 8, role: UserRole.TEACHER };
  const date = '2026-08-12T12:00:00.000Z';

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.attendance.findMany.mockResolvedValue([]);
    prisma.attendance.findFirst.mockResolvedValue(null);
    prisma.class.findFirst.mockResolvedValue({ id: 2 });
    prisma.class.findUnique.mockResolvedValue({ id: 2, teacherUserId: 8 });
    prisma.studentClass.findMany.mockResolvedValue([{ studentId: 3 }, { studentId: 4 }]);
    prisma.studentClass.findFirst.mockResolvedValue({ id: 1 });
    prisma.attendance.create.mockResolvedValue({ id: 1 });
    tx.attendance.createMany.mockResolvedValue({ count: 2 });
  });

  it('lista presenças ordenadas', async () => { await service.findAll(); expect(prisma.attendance.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { attendanceDate: 'desc' } })); });
  it('filtra por studentId', async () => { await service.findAll({ studentId: 3 }); expect(prisma.attendance.findMany.mock.calls[0][0].where.studentId).toBe(3); });
  it('filtra por classId', async () => { await service.findAll({ classId: 2 }); expect(prisma.attendance.findMany.mock.calls[0][0].where.classId).toBe(2); });
  it('filtra por período', async () => { await service.findAll({ startDate: date, endDate: date }); expect(prisma.attendance.findMany.mock.calls[0][0].where.attendanceDate).toEqual({ gte: new Date(date), lte: new Date(date) }); });
  it('registra presença individual', async () => { await service.create({ classId: 2, studentId: 3, attendanceDate: date, status: AttendanceStatus.PRESENT }); expect(prisma.attendance.create).toHaveBeenCalled(); });
  it('rejeita aluno inexistente na turma no registro individual', async () => { prisma.studentClass.findFirst.mockResolvedValue(null); await expect(service.create({ classId: 2, studentId: 99, attendanceDate: date, status: AttendanceStatus.PRESENT })).rejects.toBeInstanceOf(NotFoundException); });
  it('registra chamada em lote transacional', async () => { const result = await service.createBatch({ classId: 2, attendanceDate: date, students: [{ studentId: 3, status: AttendanceStatus.PRESENT }, { studentId: 4, status: AttendanceStatus.ABSENT }] }); expect(result.processedStudents).toBe(2); expect(prisma.$transaction).toHaveBeenCalled(); });
  it('impede duplicidade', async () => { prisma.attendance.findMany.mockResolvedValue([{ studentId: 3 }]); await expect(service.createBatch({ classId: 2, attendanceDate: date, students: [{ studentId: 3, status: AttendanceStatus.PRESENT }] })).rejects.toBeInstanceOf(ConflictException); });
  it('permite professor registrar própria turma', async () => { await expect(service.createBatch({ classId: 2, attendanceDate: date, students: [{ studentId: 3, status: AttendanceStatus.PRESENT }] }, teacher)).resolves.toBeDefined(); });
  it('rejeita professor em turma de outro professor', async () => { prisma.class.findUnique.mockResolvedValue({ id: 2, teacherUserId: 9 }); await expect(service.createBatch({ classId: 2, attendanceDate: date, students: [{ studentId: 3, status: AttendanceStatus.PRESENT }] }, teacher)).rejects.toBeInstanceOf(ConflictException); });
  it('rejeita aluno não vinculado à turma', async () => { await expect(service.createBatch({ classId: 2, attendanceDate: date, students: [{ studentId: 99, status: AttendanceStatus.PRESENT }] })).rejects.toBeInstanceOf(ConflictException); });
  it('rejeita turma inexistente', async () => { prisma.class.findUnique.mockResolvedValue(null); await expect(service.createBatch({ classId: 2, attendanceDate: date, students: [{ studentId: 3, status: AttendanceStatus.PRESENT }] })).rejects.toBeInstanceOf(NotFoundException); });
  it('rejeita período invertido', async () => { await expect(service.findAll({ startDate: '2026-08-13T00:00:00Z', endDate: '2026-08-12T00:00:00Z' })).rejects.toBeInstanceOf(BadRequestException); });
});
