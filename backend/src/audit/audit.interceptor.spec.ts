import { of, throwError } from 'rxjs';
import { UnauthorizedException } from '@nestjs/common';
import { AuditInterceptor } from './audit.interceptor';
import { AuthController } from '../auth/auth.controller';

describe('AuditInterceptor', () => {
  it('logs a successful sensitive operation with actor and entity id', (done) => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue({ action: 'UPDATE', entity: 'Student', entityIdParam: 'id' }) };
    const auditService = { record: jest.fn().mockResolvedValue({ id: 1 }) };
    const request = { user: { id: 9 }, params: { id: '42' }, body: { notes: 'updated' } };
    const context = { getHandler: jest.fn(), getClass: jest.fn(), switchToHttp: () => ({ getRequest: () => request }) };
    const interceptor = new AuditInterceptor(reflector as any, auditService as any);
    interceptor.intercept(context as any, { handle: () => of({ id: 42 }) }).subscribe({
      complete: () => {
        expect(auditService.record).toHaveBeenCalledWith({ userId: 9, action: 'UPDATE', entity: 'Student', entityId: '42', metadata: { changedFields: ['notes'] } });
        done();
      },
    });
  });

  it('gets the actor from a successful login result', (done) => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue({ action: 'LOGIN_SUCCESS', entity: 'User' }) };
    const auditService = { record: jest.fn().mockResolvedValue({ id: 1 }) };
    const context = { getHandler: jest.fn(), getClass: jest.fn(), switchToHttp: () => ({ getRequest: () => ({ body: { email: 'a@b.com', password: 'secret' }, params: {} }) }) };
    const interceptor = new AuditInterceptor(reflector as any, auditService as any);
    interceptor.intercept(context as any, { handle: () => of({ access_token: 'jwt', user: { id: 5 } }) }).subscribe({
      complete: () => {
        expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({ userId: 5, entityId: '5' }));
        done();
      },
    });
  });

  it('does not create a false audit entry when the operation fails', (done) => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue({ action: 'DELETE', entity: 'Plan', entityIdParam: 'id' }) };
    const auditService = { record: jest.fn() };
    const context = { getHandler: jest.fn(), getClass: jest.fn(), switchToHttp: () => ({ getRequest: () => ({ user: { id: 9 }, params: { id: '42' }, body: {} }) }) };
    const interceptor = new AuditInterceptor(reflector as any, auditService as any);
    interceptor.intercept(context as any, { handle: () => throwError(() => new Error('operation rolled back')) }).subscribe({
      error: () => {
        expect(auditService.record).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('records a failed login without password and keeps the generic response', async () => {
    const authService = { validateUser: jest.fn().mockResolvedValue(null) };
    const auditService = { record: jest.fn().mockResolvedValue({ id: 1 }) };
    const controller = new AuthController(authService as any, auditService as any);

    await expect(controller.login({ email: 'User@Example.com', password: 'never-log-this' })).rejects.toEqual(
      expect.objectContaining({ response: expect.objectContaining({ message: 'Credenciais inválidas' }) }),
    );
    expect(auditService.record).toHaveBeenCalledWith({
      action: 'LOGIN_FAILED',
      entity: 'User',
      metadata: { identifier: 'user@example.com', reason: 'INVALID_CREDENTIALS' },
    });
    expect(JSON.stringify(auditService.record.mock.calls)).not.toContain('never-log-this');
  });

  it('does not let an audit storage failure change the failed-login response', async () => {
    const authService = { validateUser: jest.fn().mockResolvedValue(null) };
    const auditService = { record: jest.fn().mockResolvedValue(null) };
    const controller = new AuthController(authService as any, auditService as any);
    await expect(controller.login({ email: 'user@example.com', password: 'secret' })).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
