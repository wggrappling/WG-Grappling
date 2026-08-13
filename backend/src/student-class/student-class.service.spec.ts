import { ConflictException, NotFoundException } from '@nestjs/common';
import { StudentClassService } from './student-class.service';

describe('StudentClassService', () => {
  const prisma = { student: { findUnique: jest.fn() }, class: { findFirst: jest.fn() }, studentModality: { findFirst: jest.fn() }, studentClass: { findFirst: jest.fn(), create: jest.fn() } };
  const service = new StudentClassService(prisma as never); const dto = { studentId: 1, classId: 2 };
  beforeEach(() => { jest.clearAllMocks(); prisma.student.findUnique.mockResolvedValue({ id: 1 }); prisma.class.findFirst.mockResolvedValue({ id: 2, modalityId: 5 }); prisma.studentModality.findFirst.mockResolvedValue({ id: 6 }); prisma.studentClass.findFirst.mockResolvedValue(null); prisma.studentClass.create.mockResolvedValue({ id: 7 }); });
  it('adiciona turma ativa compatível', async () => { await expect(service.create(dto)).resolves.toEqual({ id: 7 }); });
  it('rejeita turma inválida ou inativa', async () => { prisma.class.findFirst.mockResolvedValue(null); await expect(service.create(dto)).rejects.toBeInstanceOf(NotFoundException); });
  it('rejeita turma incompatível com modalidades ativas', async () => { prisma.studentModality.findFirst.mockResolvedValue(null); await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException); });
  it('rejeita vínculo duplicado', async () => { prisma.studentClass.findFirst.mockResolvedValue({ id: 8 }); await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException); });
});
