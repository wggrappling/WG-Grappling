import { ConflictException, NotFoundException } from '@nestjs/common';
import { StudentModalityService } from './student-modality.service';

describe('StudentModalityService', () => {
  const prisma = { student: { findUnique: jest.fn() }, modality: { findFirst: jest.fn() }, studentModality: { findUnique: jest.fn(), create: jest.fn() } };
  const service = new StudentModalityService(prisma as never);
  const dto = { studentId: 1, modalityId: 2, startedAt: '2026-01-01T00:00:00.000Z', status: 'ACTIVE' as const };
  beforeEach(() => { jest.clearAllMocks(); prisma.student.findUnique.mockResolvedValue({ id: 1 }); prisma.modality.findFirst.mockResolvedValue({ id: 2 }); prisma.studentModality.findUnique.mockResolvedValue(null); prisma.studentModality.create.mockResolvedValue({ id: 3 }); });
  it('adiciona modalidade ativa válida', async () => { await expect(service.create(dto)).resolves.toEqual({ id: 3 }); expect(prisma.studentModality.create).toHaveBeenCalled(); });
  it('rejeita modalidade inválida ou inativa', async () => { prisma.modality.findFirst.mockResolvedValue(null); await expect(service.create(dto)).rejects.toBeInstanceOf(NotFoundException); });
  it('rejeita vínculo duplicado', async () => { prisma.studentModality.findUnique.mockResolvedValue({ id: 4 }); await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException); });
});
