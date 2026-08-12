import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../users/dto/create-user.dto';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should allow access when the user role is included in the allowed roles', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: UserRole.ADMIN } }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;

    reflector.get = jest.fn().mockReturnValue([UserRole.ADMIN, UserRole.OWNER]);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when the user role is not included in the allowed roles', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: UserRole.TEACHER } }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;

    reflector.get = jest.fn().mockReturnValue([UserRole.ADMIN, UserRole.OWNER]);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should reject a request without an authenticated user', () => {
    const context = {
      switchToHttp: () => ({ getRequest: () => ({}) }),
      getHandler: () => ({}), getClass: () => ({}),
    } as ExecutionContext;
    reflector.get = jest.fn().mockReturnValue([UserRole.ADMIN]);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
