import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';

describe('EnrollmentService', () => {
  const tx = {
    person: { create: jest.fn() },
    student: { create: jest.fn() },
    studentPlan: { findFirst: jest.fn(), create: jest.fn() },
    studentModality: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    studentClass: { create: jest.fn() },
    address: { create: jest.fn() },
    responsible: { create: jest.fn() },
    studentResponsible: { create: jest.fn() },
  };
  const prisma = {
    student: { findUnique: jest.fn() },
    person: { findFirst: jest.fn() },
    responsible: { findUnique: jest.fn() },
    plan: { findFirst: jest.fn() },
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
    prisma.responsible.findUnique.mockResolvedValue(null);
    prisma.plan.findFirst.mockResolvedValue({ id: 2, active: true });
    prisma.modality.findMany.mockResolvedValue([{ id: 3 }]);
    prisma.class.findMany.mockResolvedValue([{ id: 4, modalityId: 3, capacity: 20, _count: { studentClasses: 0 } }]);
    tx.person.create.mockResolvedValue({ id: 10 });
    tx.student.create.mockResolvedValue({ id: 20 });
    tx.studentPlan.create.mockResolvedValue({ id: 30 });
    tx.studentPlan.findFirst.mockResolvedValue(null);
    tx.studentModality.findFirst.mockResolvedValue(null);
    tx.studentModality.update.mockResolvedValue({ id: 41 });
    tx.studentModality.create.mockResolvedValue({ id: 40 });
    tx.studentClass.create.mockResolvedValue({ id: 50 });
    tx.address.create.mockResolvedValue({ id: 60 });
    tx.responsible.create.mockResolvedValue({ id: 70 });
    tx.studentResponsible.create.mockResolvedValue({ id: 80 });
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

  it('impede segundo plano ACTIVE no fluxo de matrícula', async () => {
    prisma.student.findUnique.mockResolvedValue({ id: 7 });
    tx.studentPlan.findFirst.mockResolvedValue({ id: 99 });
    await expect(service.create({ ...base, studentId: 7 })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.studentPlan.create).not.toHaveBeenCalled();
  });

  it('reativa modalidade PAUSED no fluxo de matrícula', async () => {
    prisma.student.findUnique.mockResolvedValue({ id: 7 });
    tx.studentModality.findFirst.mockResolvedValue({ id: 41, status: 'PAUSED' });
    await service.create({ ...base, studentId: 7 });
    expect(tx.studentModality.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 41 }, data: expect.objectContaining({ status: 'ACTIVE', resumedAt: expect.any(Date) }) }));
  });

  it('cria pessoa, aluno e matrícula na mesma transação', async () => {
    const response = await service.create({
      ...base,
      person: { name: 'Aluno Novo', cpf: '52998224725', email: 'aluno@example.com' },
      student: {},
      address: { street: 'Rua A', neighborhood: 'Centro', city: 'São Paulo', state: 'SP', zipCode: '01001000' },
      responsible: { name: 'Responsável', cpf: '11144477735', relationship: 'Mãe' },
    });

    expect(tx.person.create).toHaveBeenCalled();
    expect(tx.student.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ personId: 10, enrollmentNumber: 'WG-2026-000010' }),
    }));
    expect(tx.address.create).toHaveBeenCalledWith({ data: expect.objectContaining({ personId: 10 }) });
    expect(tx.studentResponsible.create).toHaveBeenCalledWith({ data: { studentId: 20, responsibleId: 70 } });
    expect(chargeGenerator.generateEnrollmentCharges).toHaveBeenCalledWith(20, 2, expect.any(Date), 10, 150, tx);
    expect(response.data.studentId).toBe(20);
  });

  it('rejeita a mistura de studentId com dados de aluno novo', async () => {
    await expect(service.create({
      ...base,
      studentId: 7,
      person: { name: 'Aluno Novo', cpf: '52998224725', email: 'aluno@example.com' },
      student: {},
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('impede duplicidade de CPF ou e-mail antes da transação', async () => {
    prisma.person.findFirst.mockResolvedValue({ id: 1 });

    await expect(service.create({
      ...base,
      person: { name: 'Aluno Novo', cpf: '52998224725', email: 'aluno@example.com' },
      student: {},
    })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejeita plano inexistente ou inativo', async () => {
    prisma.plan.findFirst.mockResolvedValue(null);
    await expect(service.create({
      ...base,
      person: { name: 'Aluno Novo', cpf: '52998224725', email: 'aluno@example.com' },
      student: {},
    })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejeita turma incompatível com a modalidade', async () => {
    prisma.class.findMany.mockResolvedValue([{ id: 4, modalityId: 99, capacity: 20, _count: { studentClasses: 0 } }]);
    await expect(service.create({
      ...base,
      person: { name: 'Aluno Novo', cpf: '52998224725', email: 'aluno@example.com' },
      student: {},
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejeita turma sem capacidade', async () => {
    prisma.class.findMany.mockResolvedValue([{ id: 4, modalityId: 3, capacity: 20, _count: { studentClasses: 20 } }]);
    await expect(service.create({
      ...base,
      person: { name: 'Aluno Novo', cpf: '52998224725', email: 'aluno@example.com' },
      student: {},
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejeita modalidade inativa ou inexistente', async () => {
    prisma.modality.findMany.mockResolvedValue([]);
    await expect(service.create({
      ...base,
      person: { name: 'Aluno Novo', cpf: '52998224725', email: 'aluno@example.com' },
      student: {},
    })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejeita turma inativa ou com professor inativo', async () => {
    prisma.class.findMany.mockResolvedValue([]);
    await expect(service.create({
      ...base,
      person: { name: 'Aluno Novo', cpf: '52998224725', email: 'aluno@example.com' },
      student: {},
    })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('propaga falha de Person dentro da transação sem avançar o cadastro', async () => {
    tx.person.create.mockRejectedValueOnce(new Error('person failed'));
    await expect(service.create({
      ...base,
      person: { name: 'Aluno Novo', cpf: '52998224725', email: 'aluno@example.com' },
      student: {},
    })).rejects.toThrow('person failed');
    expect(tx.student.create).not.toHaveBeenCalled();
  });

  it('propaga falha de Student dentro da transação sem criar matrícula', async () => {
    tx.student.create.mockRejectedValueOnce(new Error('student failed'));
    await expect(service.create({
      ...base,
      person: { name: 'Aluno Novo', cpf: '52998224725', email: 'aluno@example.com' },
      student: {},
    })).rejects.toThrow('student failed');
    expect(tx.studentPlan.create).not.toHaveBeenCalled();
  });

  it('propaga falha da matrícula e não gera cobranças', async () => {
    tx.studentPlan.create.mockRejectedValueOnce(new Error('enrollment failed'));
    await expect(service.create({
      ...base,
      person: { name: 'Aluno Novo', cpf: '52998224725', email: 'aluno@example.com' },
      student: {},
    })).rejects.toThrow('enrollment failed');
    expect(chargeGenerator.generateEnrollmentCharges).not.toHaveBeenCalled();
  });
});
