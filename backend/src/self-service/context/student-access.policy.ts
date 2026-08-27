import { ForbiddenException, Injectable } from '@nestjs/common';
import { StudentStatus } from '../../../generated/prisma/enums';
import type { AuthenticatedUserContext } from './authenticated-user-context';

export enum SelfServiceCapability {
  READ = 'READ',
  OPERATE = 'OPERATE',
}

@Injectable()
export class StudentAccessPolicy {
  capabilitiesFor(status: StudentStatus): readonly SelfServiceCapability[] {
    if (status === StudentStatus.ACTIVE) {
      return [SelfServiceCapability.READ, SelfServiceCapability.OPERATE];
    }

    if (status === StudentStatus.PAUSED) {
      return [SelfServiceCapability.READ];
    }

    throw new ForbiddenException('Contexto ALUNO não disponível.');
  }

  assertCapability(
    context: AuthenticatedUserContext,
    capability: SelfServiceCapability,
  ): void {
    if (!context.capabilities.includes(capability)) {
      throw new ForbiddenException('Operação indisponível para o estado do aluno.');
    }
  }
}
