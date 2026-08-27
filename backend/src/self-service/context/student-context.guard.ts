import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/enums';
import type { AuthenticatedUserContext } from './authenticated-user-context';
import { StudentContextResolver } from './student-context.resolver';

type SelfServiceRequest = {
  user?: { id: number; role: UserRole; active: boolean };
  authContext?: AuthenticatedUserContext;
};

@Injectable()
export class StudentContextGuard implements CanActivate {
  constructor(private readonly resolver: StudentContextResolver) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SelfServiceRequest>();
    if (!request.user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    request.authContext = await this.resolver.resolve(request.user);
    return true;
  }
}
