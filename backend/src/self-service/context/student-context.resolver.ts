import { ForbiddenException, Injectable } from '@nestjs/common';
import { StudentStatus, UserRole } from '../../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  AuthenticatedAccount,
  AuthenticatedUserContext,
} from './authenticated-user-context';

@Injectable()
export class StudentContextResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(account: AuthenticatedAccount): Promise<AuthenticatedUserContext> {
    if (!account?.active || account.role !== UserRole.ALUNO) {
      throw new ForbiddenException('Contexto ALUNO não disponível.');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: account.id, active: true, role: UserRole.ALUNO },
      select: {
        id: true,
        role: true,
        studentId: true,
        student: { select: { id: true, status: true } },
      },
    });

    if (
      !user?.studentId ||
      !user.student ||
      user.student.id !== user.studentId ||
      user.student.status !== StudentStatus.ACTIVE
    ) {
      throw new ForbiddenException('Contexto ALUNO não disponível.');
    }

    return {
      userId: user.id,
      role: UserRole.ALUNO,
      studentId: user.studentId,
    };
  }
}
