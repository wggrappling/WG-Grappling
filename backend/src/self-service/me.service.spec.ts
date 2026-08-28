import { ForbiddenException } from '@nestjs/common';
import { StudentStatus, UserRole } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { SelfServiceCapability } from './context/student-access.policy';
import { MeService } from './me.service';

describe('MeService', () => {
  const prisma = {
    user: { findFirst: jest.fn() },
    student: { findFirst: jest.fn() },
  };
  const service = new MeService(prisma as unknown as PrismaService);
  const context = {
    userId: 5,
    role: UserRole.ALUNO,
    studentId: 20,
    studentStatus: StudentStatus.ACTIVE,
    capabilities: [SelfServiceCapability.READ, SelfServiceCapability.OPERATE],
  } as const;
  const joinedAt = new Date('2025-01-01T00:00:00.000Z');
  const student = {
    id: 20,
    enrollmentNumber: 'WG-20',
    status: StudentStatus.ACTIVE,
    joinedAt,
    person: { name: 'Aluno A', email: 'a@teste.local', phone: '11999999999', cpf: '52998224725', address: null },
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

  it('allows a PAUSED Student to consult GET /me and reports inactive academic context', async () => {
    const pausedStudent = { ...student, status: StudentStatus.PAUSED };
    prisma.user.findFirst.mockResolvedValue({
      id: 5, name: 'Conta A', email: 'a@teste.local', role: UserRole.ALUNO, active: true, student: pausedStudent,
    });
    const pausedContext = {
      ...context,
      studentStatus: StudentStatus.PAUSED,
      capabilities: [SelfServiceCapability.READ],
    } as const;

    await expect(service.getMe(pausedContext)).resolves.toEqual(
      expect.objectContaining({
        student: expect.objectContaining({ status: StudentStatus.PAUSED }),
        academicContext: { active: false },
      }),
    );
  });

  it('allows a PAUSED Student to consult only their own profile', async () => {
    prisma.student.findFirst.mockResolvedValue({ ...student, status: StudentStatus.PAUSED });
    const pausedContext = {
      ...context,
      studentStatus: StudentStatus.PAUSED,
      capabilities: [SelfServiceCapability.READ],
    } as const;

    await expect(service.getProfile(pausedContext)).resolves.toEqual(
      expect.objectContaining({ studentStatus: StudentStatus.PAUSED }),
    );
    expect(prisma.student.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 20, user: { id: 5 } },
    }));
  });

  it('returns masked CPF and own address in a closed profile projection', async () => {
    prisma.student.findFirst.mockResolvedValue({ ...student, person: { ...student.person, address: { zipCode: '01001000', street: 'Praça da Sé', number: '10', complement: null, neighborhood: 'Sé', city: 'São Paulo', state: 'SP', country: 'Brasil' } } });
    const result = await service.getProfile(context);
    expect(result).toEqual({
      name: 'Aluno A',
      email: 'a@teste.local',
      phone: '11999999999',
      maskedCpf: '***.982.247-**',
      address: { zipCode: '01001000', street: 'Praça da Sé', number: '10', complement: null, neighborhood: 'Sé', city: 'São Paulo', state: 'SP', country: 'Brasil' },
      enrollmentNumber: 'WG-20',
      studentStatus: StudentStatus.ACTIVE,
      joinedAt,
    });
    expect(result).not.toHaveProperty('cpf');
    expect(result).not.toHaveProperty('notes');
    expect(result).not.toHaveProperty('sessionVersion');
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('role');
  });

  it('fails safely when a legacy CPF cannot be masked', async () => {
    prisma.student.findFirst.mockResolvedValue({ ...student, person: { ...student.person, cpf: 'invalid' } });
    await expect(service.getProfile(context)).resolves.toEqual(expect.objectContaining({ maskedCpf: '***.***.***-**' }));
  });

  it('fails closed instead of returning another Student', async () => {
    prisma.student.findFirst.mockResolvedValue(null);
    await expect(service.getProfile(context)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
