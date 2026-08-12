import { BadRequestException, ConflictException } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';

describe('EnrollmentService', () => {
  const tx = {
    person: { create: jest.fn() },
    student: { create: jest.fn() },
    studentPlan: { create: jest.fn() },
    studentModality: { create: jest.fn() },
    studentClass: { create: jest.fn() },
  };
  const prisma = {
    student: { findUnique: jest.fn() },
    person: { findFirst: jest.fn() },
    plan: { findUnique: jest.fn() },
    modality: { findMany: jest.fn() },
    class: { findMany: jest.fn() },
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const chargeGenerator = { generateEnrollmentCharges: jest.fn() };
  const service = new EnrollmentService(prisma as never, chargeGenerator as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.person.findFirst.mockResolvedValue(null);
    prisma.student.findUnique.mockResolvedValue(null);
    prisma.plan.findUnique.mockResolvedValue({ id: 2 });
    prisma.modality.findMany.mockResolvedValue([{ id: 3 }]);
    prisma.class.findMany.mockResolvedValue([{ id: 4 }]);
    tx.person.create.mockResolvedValue({ id: 10 });
    tx.student.create.mockResolvedValue({ id: 20 });
    tx.studentPlan.create.mockResolvedValue({ id: 30 });
    tx.studentModality.create.mockResolvedValue({ id: 40 });
    tx.studentClass.create.mockResolvedValue({ id: 50 });
  });

  const base = {
    planId: 2,
    monthlyPrice: 150,
    billingDay: 10,
    startDate: '2026-08-12T00:00:00.000Z',
    modalityIds: [3],
    classIds: [4],
  };

  it('preserva o fluxo para aluno existente', async () => {
    prisma.student.findUnique.mockResolvedValue({ id: 7 });

    const response = await service.create({ ...base, studentId: 7 });

    expect(tx.person.create).not.toHaveBeenCalled();
    expect(tx.studentPlan.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ studentId: 7 }) }));
    expect(chargeGenerator.generateEnrollmentCharges).toHaveBeenCalledWith(7, 2, expect.any(Date), 10, 150, tx);
    expect(response.data.studentId).toBe(7);
  });

  it('cria pessoa, aluno e matrícula na mesma transação', async () => {
    const response = await service.create({
      ...base,
      person: { name: 'Aluno Novo', cpf: '12345678901', email: 'aluno@example.com' },
      student: {},
    });

    expect(tx.person.create).toHaveBeenCalled();
    expect(tx.student.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ personId: 10, enrollmentNumber: 'WG-2026-000010' }),
    }));
    expect(chargeGenerator.generateEnrollmentCharges).toHaveBeenCalledWith(20, 2, expect.any(Date), 10, 150, tx);
    expect(response.data.studentId).toBe(20);
  });

  it('rejeita a mistura de studentId com dados de aluno novo', async () => {
    await expect(service.create({
      ...base,
      studentId: 7,
      person: { name: 'Aluno Novo', cpf: '12345678901', email: 'aluno@example.com' },
      student: {},
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('impede duplicidade de CPF ou e-mail antes da transação', async () => {
    prisma.person.findFirst.mockResolvedValue({ id: 1 });

    await expect(service.create({
      ...base,
      person: { name: 'Aluno Novo', cpf: '12345678901', email: 'aluno@example.com' },
      student: {},
    })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
