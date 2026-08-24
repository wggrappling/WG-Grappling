import { ConflictException, NotFoundException } from '@nestjs/common';
import { StudentClassStatus } from '../../generated/prisma/enums';
import { StudentClassService } from './student-class.service';

describe('StudentClassService lifecycle', () => {
  const prisma = {
    student: { findUnique: jest.fn() }, class: { findFirst: jest.fn() }, studentModality: { findFirst: jest.fn() },
    studentClass: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  };
  const service = new StudentClassService(prisma as never); const dto = { studentId: 1, classId: 2 };
  beforeEach(() => {
    jest.clearAllMocks(); prisma.student.findUnique.mockResolvedValue({ id: 1 }); prisma.class.findFirst.mockResolvedValue({ id: 2, modalityId: 5, capacity: 20, _count: { studentClasses: 0 } });
    prisma.studentModality.findFirst.mockResolvedValue({ id: 6 }); prisma.studentClass.findFirst.mockResolvedValue(null); prisma.studentClass.create.mockResolvedValue({ id: 7 }); prisma.studentClass.update.mockResolvedValue({ id: 7 });
  });
  it('vincula aluno em turma ativa compatível', async () => { await expect(service.create(dto)).resolves.toEqual({ id: 7 }); expect(prisma.studentClass.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: StudentClassStatus.ACTIVE, joinedAt: expect.any(Date) }) })); });
  it('encerra saída da turma sem apagar histórico', async () => { prisma.studentClass.findUnique.mockResolvedValue({ id: 7, status: StudentClassStatus.ACTIVE }); await service.remove(7); expect(prisma.studentClass.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { status: StudentClassStatus.FINISHED, leftAt: expect.any(Date) } }); });
  it('permite reentrada criando novo período após FINISHED', async () => { await service.create(dto); expect(prisma.studentClass.create).toHaveBeenCalled(); });
  it('impede vínculo ACTIVE duplicado', async () => { prisma.studentClass.findFirst.mockResolvedValue({ id: 8, status: StudentClassStatus.ACTIVE }); await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException); });
  it('impede turma lotada', async () => { prisma.class.findFirst.mockResolvedValue({ id: 2, modalityId: 5, capacity: 20, _count: { studentClasses: 20 } }); await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException); });
  it('impede modalidade incompatível', async () => { prisma.studentModality.findFirst.mockResolvedValue(null); await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException); });
  it('rejeita turma inválida ou inativa', async () => { prisma.class.findFirst.mockResolvedValue(null); await expect(service.create(dto)).rejects.toBeInstanceOf(NotFoundException); });
});
