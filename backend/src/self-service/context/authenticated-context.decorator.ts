import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUserContext } from './authenticated-user-context';

export const AuthenticatedContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUserContext => {
    const request = context.switchToHttp().getRequest<{
      authContext: AuthenticatedUserContext;
    }>();
    return request.authContext;
  },
);
