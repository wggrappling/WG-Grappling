import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  AuthenticatedAccount,
  AuthenticatedUserContext,
} from './authenticated-user-context';
import { StudentAccessPolicy } from './student-access.policy';

@Injectable()
export class StudentContextResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicy: StudentAccessPolicy,
  ) {}

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
      user.student.id !== user.studentId
    ) {
      throw new ForbiddenException('Contexto ALUNO não disponível.');
    }

    const capabilities = this.accessPolicy.capabilitiesFor(user.student.status);

    return {
      userId: user.id,
      role: UserRole.ALUNO,
      studentId: user.studentId,
      studentStatus: user.student.status,
      capabilities,
    };
  }
}
