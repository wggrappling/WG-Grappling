import { ConflictException, NotFoundException } from '@nestjs/common';
import { StudentModalityStatus } from '../../generated/prisma/enums';
import { StudentModalityService } from './student-modality.service';

describe('StudentModalityService lifecycle', () => {
  const prisma = {
    student: { findUnique: jest.fn() }, modality: { findFirst: jest.fn() }, studentClass: { findFirst: jest.fn() },
    studentModality: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  };
  const service = new StudentModalityService(prisma as never);
  const dto = { studentId: 1, modalityId: 2, startedAt: '2026-01-01T00:00:00.000Z', status: StudentModalityStatus.ACTIVE };
  beforeEach(() => {
    jest.clearAllMocks(); prisma.student.findUnique.mockResolvedValue({ id: 1 }); prisma.modality.findFirst.mockResolvedValue({ id: 2 });
    prisma.studentModality.findFirst.mockResolvedValue(null); prisma.studentClass.findFirst.mockResolvedValue(null); prisma.studentModality.create.mockResolvedValue({ id: 3 }); prisma.studentModality.update.mockResolvedValue({ id: 4 });
  });
  it('cria modalidade ACTIVE para aluno sem vínculo corrente', async () => { await expect(service.create(dto)).resolves.toEqual({ id: 3 }); expect(prisma.studentModality.create).toHaveBeenCalled(); });
  it('impede duplicação ACTIVE', async () => { prisma.studentModality.findFirst.mockResolvedValue({ id: 4, status: StudentModalityStatus.ACTIVE }); await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException); });
  it('reativa vínculo PAUSED sem apagar o período', async () => { prisma.studentModality.findFirst.mockResolvedValue({ id: 4, status: StudentModalityStatus.PAUSED }); await service.create(dto); expect(prisma.studentModality.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 4 }, data: { status: StudentModalityStatus.ACTIVE, resumedAt: expect.any(Date) } })); expect(prisma.studentModality.create).not.toHaveBeenCalled(); });
  it('pausa modalidade e registra pausedAt', async () => { prisma.studentModality.findUnique.mockResolvedValue({ id: 4, studentId: 1, modalityId: 2, status: StudentModalityStatus.ACTIVE }); await service.update(4, { status: StudentModalityStatus.PAUSED }); expect(prisma.studentModality.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ pausedAt: expect.any(Date) }) })); });
  it('finaliza modalidade sem excluir histórico', async () => { prisma.studentModality.findUnique.mockResolvedValue({ id: 4, studentId: 1, modalityId: 2, status: StudentModalityStatus.ACTIVE }); await service.remove(4); expect(prisma.studentModality.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: StudentModalityStatus.FINISHED, finishedAt: expect.any(Date) } })); });
  it('impede pausa enquanto houver turma ativa da modalidade', async () => { prisma.studentModality.findUnique.mockResolvedValue({ id: 4, studentId: 1, modalityId: 2, status: StudentModalityStatus.ACTIVE }); prisma.studentClass.findFirst.mockResolvedValue({ id: 9 }); await expect(service.update(4, { status: StudentModalityStatus.PAUSED })).rejects.toBeInstanceOf(ConflictException); });
  it('permite novo período quando só existe histórico FINISHED', async () => { await service.create(dto); expect(prisma.studentModality.create).toHaveBeenCalled(); });
  it('rejeita modalidade inválida ou inativa', async () => { prisma.modality.findFirst.mockResolvedValue(null); await expect(service.create(dto)).rejects.toBeInstanceOf(NotFoundException); });
});
