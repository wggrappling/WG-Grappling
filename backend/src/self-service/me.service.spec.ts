import { ForbiddenException } from '@nestjs/common';
import { StudentStatus, UserRole } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { MeService } from './me.service';

describe('MeService', () => {
  const prisma = {
    user: { findFirst: jest.fn() },
    student: { findFirst: jest.fn() },
  };
  const service = new MeService(prisma as unknown as PrismaService);
  const context = { userId: 5, role: UserRole.ALUNO, studentId: 20 } as const;
  const joinedAt = new Date('2025-01-01T00:00:00.000Z');
  const student = {
    id: 20,
    enrollmentNumber: 'WG-20',
    status: StudentStatus.ACTIVE,
    joinedAt,
    person: { name: 'Aluno A', email: 'a@teste.local', phone: '11999999999' },
  };

  beforeEach(() => jest.clearAllMocks());

  it('returns MeProjection for only the Student linked to the authenticated User', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 5, name: 'Conta A', email: 'a@teste.local', role: UserRole.ALUNO, active: true, student,
    });

    await expect(service.getMe(context)).resolves.toEqual({
      account: { id: 5, name: 'Conta A', email: 'a@teste.local', role: UserRole.ALUNO, active: true },
      student: { id: 20, name: 'Aluno A', enrollmentNumber: 'WG-20', status: StudentStatus.ACTIVE, joinedAt },
      academicContext: { active: true },
    });
    expect(prisma.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 5, role: UserRole.ALUNO, active: true, studentId: 20 },
    }));
  });

  it('does not accept a client-selected studentId and keeps ownership from context', async () => {
    prisma.student.findFirst.mockResolvedValue(student);
    await service.getProfile(context);
    expect(prisma.student.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 20, user: { id: 5 } },
    }));
  });

  it('returns the approved profile without CPF, address, notes or credentials', async () => {
    prisma.student.findFirst.mockResolvedValue(student);
    const result = await service.getProfile(context);
    expect(result).toEqual({
      id: 20,
      name: 'Aluno A',
      email: 'a@teste.local',
      phone: '11999999999',
      enrollmentNumber: 'WG-20',
      studentStatus: StudentStatus.ACTIVE,
      joinedAt,
    });
    expect(result).not.toHaveProperty('cpf');
    expect(result).not.toHaveProperty('address');
    expect(result).not.toHaveProperty('notes');
    expect(result).not.toHaveProperty('sessionVersion');
  });

  it('fails closed instead of returning another Student', async () => {
    prisma.student.findFirst.mockResolvedValue(null);
    await expect(service.getProfile(context)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
