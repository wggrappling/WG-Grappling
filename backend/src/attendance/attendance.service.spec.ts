import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AttendanceStatus, StudentClassStatus, StudentModalityStatus, UserRole } from '../../generated/prisma/enums';
import { AttendanceService } from './attendance.service';

describe('AttendanceService', () => {
  const tx = {
    user: { findUnique: jest.fn() }, class: { findFirst: jest.fn() },
    studentClass: { findFirst: jest.fn() }, studentModality: { findFirst: jest.fn() },
    attendance: { create: jest.fn(), createMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = {
    attendance: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const service = new AttendanceService(prisma as never);
  const admin = { id: 1, role: UserRole.ADMIN };
  const teacher = { id: 8, role: UserRole.TEACHER };
  const dto = { classId: 2, studentId: 3, attendanceDate: '2026-08-12T12:00:00.000Z', status: AttendanceStatus.PRESENT };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.attendance.findMany.mockResolvedValue([]);
    tx.user.findUnique.mockResolvedValue({ id: 1, role: UserRole.ADMIN, active: true });
    tx.class.findFirst.mockResolvedValue({ id: 2, modalityId: 5, teacherUserId: 8 });
    tx.studentClass.findFirst.mockResolvedValue({ id: 10, status: StudentClassStatus.ACTIVE });
    tx.studentModality.findFirst.mockResolvedValue({ id: 11, status: StudentModalityStatus.ACTIVE });
    tx.attendance.create.mockResolvedValue({ id: 20, ...dto, attendanceDate: new Date('2026-08-12T00:00:00Z') });
    tx.attendance.createMany.mockResolvedValue({ count: 2 });
    tx.auditLog.create.mockResolvedValue({ id: 30 });
  });

  it('registra presença válida com data normalizada, autoria e auditoria', async () => {
    await expect(service.create(dto, admin)).resolves.toEqual(expect.objectContaining({ id: 20 }));
    expect(tx.attendance.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ recordedBy: 1, attendanceDate: new Date('2026-08-12T00:00:00Z') }) }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: 1, action: 'REGISTER', metadata: expect.objectContaining({ studentId: 3, classId: 2, modalityId: 5, result: 'SUCCESS' }) }) }));
  });

  it('rejeita turma inexistente ou inativa', async () => { tx.class.findFirst.mockResolvedValue(null); await expect(service.create(dto, admin)).rejects.toBeInstanceOf(NotFoundException); });
  it('rejeita aluno inexistente ou fora da turma', async () => { tx.studentClass.findFirst.mockResolvedValue(null); await expect(service.create(dto, admin)).rejects.toBeInstanceOf(ConflictException); });
  it('rejeita StudentClass FINISHED', async () => { tx.studentClass.findFirst.mockResolvedValue(null); await expect(service.create(dto, admin)).rejects.toThrow('vínculo ativo com esta turma'); });
  it('rejeita modalidade incompatível ou inativa', async () => { tx.studentModality.findFirst.mockResolvedValue(null); await expect(service.create(dto, admin)).rejects.toThrow('modalidade da turma'); });
  it('rejeita data futura', async () => { await expect(service.create({ ...dto, attendanceDate: '2999-01-01T12:00:00Z' }, admin)).rejects.toBeInstanceOf(BadRequestException); });
  it('rejeita usuário inativo', async () => { tx.user.findUnique.mockResolvedValue({ id: 1, role: UserRole.ADMIN, active: false }); await expect(service.create(dto, admin)).rejects.toBeInstanceOf(ForbiddenException); });

  it('permite professor ativo na própria turma', async () => { tx.user.findUnique.mockResolvedValue({ id: 8, role: UserRole.TEACHER, active: true }); await expect(service.create(dto, teacher)).resolves.toBeDefined(); });
  it('rejeita professor de outra turma', async () => { tx.user.findUnique.mockResolvedValue({ id: 8, role: UserRole.TEACHER, active: true }); tx.class.findFirst.mockResolvedValue({ id: 2, modalityId: 5, teacherUserId: 9 }); await expect(service.create(dto, teacher)).rejects.toBeInstanceOf(ForbiddenException); });

  it('traduz P2002 concorrente em conflito de domínio', async () => { tx.attendance.create.mockRejectedValue({ code: 'P2002' }); await expect(service.create(dto, admin)).rejects.toBeInstanceOf(ConflictException); });
  it('traduz violação PostgreSQL concorrente no lote', async () => { tx.attendance.createMany.mockRejectedValue({ code: '23505' }); await expect(service.createBatch({ classId: 2, attendanceDate: dto.attendanceDate, students: [{ studentId: 3, status: AttendanceStatus.PRESENT }] }, admin)).rejects.toBeInstanceOf(ConflictException); });

  it('registra lote de forma transacional e auditável', async () => {
    const result = await service.createBatch({ classId: 2, attendanceDate: dto.attendanceDate, students: [{ studentId: 3, status: AttendanceStatus.PRESENT }, { studentId: 4, status: AttendanceStatus.ABSENT }] }, admin);
    expect(result.processedStudents).toBe(2);
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'REGISTER_BATCH', metadata: expect.objectContaining({ studentIds: [3, 4], actorId: 1 }) }) }));
  });

  it('preserva histórico em consultas sem filtrar vínculos encerrados', async () => { await service.findAll({ studentId: 3 }); expect(prisma.attendance.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId: 3 } })); });
  it('rejeita período invertido', async () => { await expect(service.findAll({ startDate: '2026-08-13', endDate: '2026-08-12' })).rejects.toBeInstanceOf(BadRequestException); });

  it('corrige somente status/notas com motivo, autoria e valores anterior/novo auditados', async () => {
    tx.attendance.findUnique.mockResolvedValue({ id: 20, classId: 2, studentId: 3, status: AttendanceStatus.ABSENT, notes: null, class: { modalityId: 5 } });
    tx.attendance.update.mockResolvedValue({ id: 20, status: AttendanceStatus.JUSTIFIED, notes: 'Atestado' });
    await service.update(20, { status: AttendanceStatus.JUSTIFIED, notes: 'Atestado', correctionReason: 'Atestado apresentado' }, admin);
    expect(tx.attendance.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ correctedBy: 1, correctionReason: 'Atestado apresentado' }) }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'UPDATE', metadata: expect.objectContaining({ operation: 'CORRECTION', result: 'SUCCESS', attendanceId: 20, studentId: 3, classId: 2, modalityId: 5, actorId: 1, correctionReason: 'Atestado apresentado', previous: { status: AttendanceStatus.ABSENT, notes: null }, current: { status: AttendanceStatus.JUSTIFIED, notes: 'Atestado' } }) }) }));
  });

  it('não apaga histórico de presença', async () => { prisma.attendance.findUnique.mockResolvedValue({ id: 20 }); await expect(service.remove(20)).rejects.toBeInstanceOf(ConflictException); });
});
