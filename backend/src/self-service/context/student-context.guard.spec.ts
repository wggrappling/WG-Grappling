import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/enums';
import { StudentContextGuard } from './student-context.guard';
import { StudentContextResolver } from './student-context.resolver';
import { StudentStatus } from '../../../generated/prisma/enums';
import { SelfServiceCapability } from './student-access.policy';

describe('StudentContextGuard', () => {
  const resolver = { resolve: jest.fn() };
  const guard = new StudentContextGuard(resolver as unknown as StudentContextResolver);

  beforeEach(() => jest.clearAllMocks());

  const executionContext = (request: object) => ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as ExecutionContext;

  it('attaches the resolved context to the request once', async () => {
    const request: any = { user: { id: 3, role: UserRole.ALUNO, active: true } };
    const authContext = {
      userId: 3,
      role: UserRole.ALUNO,
      studentId: 9,
      studentStatus: StudentStatus.ACTIVE,
      capabilities: [SelfServiceCapability.READ, SelfServiceCapability.OPERATE],
    };
    resolver.resolve.mockResolvedValue(authContext);

    await expect(guard.canActivate(executionContext(request))).resolves.toBe(true);
    expect(request.authContext).toEqual(authContext);
    expect(resolver.resolve).toHaveBeenCalledTimes(1);
    expect(resolver.resolve).toHaveBeenCalledWith(request.user);
  });

  it('rejects a request without an authenticated User', async () => {
    await expect(guard.canActivate(executionContext({}))).rejects.toBeInstanceOf(UnauthorizedException);
    expect(resolver.resolve).not.toHaveBeenCalled();
  });
});
