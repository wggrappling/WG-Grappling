import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../users/dto/create-user.dto';
import { JwtStrategy } from './jwt.strategy';

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

  it('allows ALUNO only when the endpoint explicitly requires ALUNO', () => {
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user: { role: UserRole.ALUNO } }) }),
      getHandler: () => ({}), getClass: () => ({}),
    } as ExecutionContext;
    reflector.get = jest.fn().mockReturnValue([UserRole.ALUNO]);
    expect(guard.canActivate(context)).toBe(true);

    reflector.get = jest.fn().mockReturnValue([UserRole.ADMIN]);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('requires the validated JWT secret when creating the JWT strategy', () => {
    const config = { getOrThrow: jest.fn(() => { throw new Error('JWT_SECRET missing'); }) };
    expect(() => new JwtStrategy({} as any, config as any)).toThrow('JWT_SECRET missing');
    expect(config.getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
  });

  it('keeps JWT expiration validation enabled', () => {
    const strategy = new JwtStrategy({} as any, { getOrThrow: () => '12345678901234567890123456789012' } as any);
    expect((strategy as any)._verifOpts.ignoreExpiration).toBe(false);
  });
});
