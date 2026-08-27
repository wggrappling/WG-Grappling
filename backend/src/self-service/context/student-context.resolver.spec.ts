import { ForbiddenException } from '@nestjs/common';
import { StudentStatus, UserRole } from '../../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { StudentContextResolver } from './student-context.resolver';

describe('StudentContextResolver', () => {
  const prisma = { user: { findFirst: jest.fn() } };
  const resolver = new StudentContextResolver(prisma as unknown as PrismaService);
  const account = { id: 7, role: UserRole.ALUNO, active: true };

  beforeEach(() => jest.clearAllMocks());

  it('resolves an ACTIVE Student exclusively from the authenticated User link', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 7,
      role: UserRole.ALUNO,
      studentId: 41,
      student: { id: 41, status: StudentStatus.ACTIVE },
    });

    await expect(resolver.resolve(account)).resolves.toEqual({
      userId: 7,
      role: UserRole.ALUNO,
      studentId: 41,
    });
    expect(prisma.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 7, active: true, role: UserRole.ALUNO },
    }));
  });

  it.each([
    ['missing link', { id: 7, role: UserRole.ALUNO, studentId: null, student: null }],
    ['missing Student', { id: 7, role: UserRole.ALUNO, studentId: 41, student: null }],
    ['inconsistent link', { id: 7, role: UserRole.ALUNO, studentId: 41, student: { id: 42, status: StudentStatus.ACTIVE } }],
    ['inactive Student', { id: 7, role: UserRole.ALUNO, studentId: 41, student: { id: 41, status: StudentStatus.INACTIVE } }],
    ['paused Student', { id: 7, role: UserRole.ALUNO, studentId: 41, student: { id: 41, status: StudentStatus.PAUSED } }],
  ])('fails closed for %s', async (_case, row) => {
    prisma.user.findFirst.mockResolvedValue(row);
    await expect(resolver.resolve(account)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies a non-ALUNO account without querying for a Student', async () => {
    await expect(resolver.resolve({ ...account, role: UserRole.ADMIN })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('denies an inactive User without querying for a Student', async () => {
    await expect(resolver.resolve({ ...account, active: false })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('does not reuse a removed link on the next resolution', async () => {
    prisma.user.findFirst
      .mockResolvedValueOnce({ id: 7, role: UserRole.ALUNO, studentId: 41, student: { id: 41, status: StudentStatus.ACTIVE } })
      .mockResolvedValueOnce({ id: 7, role: UserRole.ALUNO, studentId: null, student: null });

    await expect(resolver.resolve(account)).resolves.toEqual(expect.objectContaining({ studentId: 41 }));
    await expect(resolver.resolve(account)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.findFirst).toHaveBeenCalledTimes(2);
  });
});
