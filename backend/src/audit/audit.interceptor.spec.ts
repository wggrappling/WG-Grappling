import { of, throwError } from 'rxjs';
import { UnauthorizedException } from '@nestjs/common';
import { AuditInterceptor } from './audit.interceptor';
import { AuthController } from '../auth/auth.controller';
import { LoginRateLimitedException } from '../auth/login-rate-limit.service';

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
    const rateLimit = { accountKey: jest.fn(() => 'account-hash'), ipKey: jest.fn(() => 'ip-hash'), consumeAttempt: jest.fn(), resetAccount: jest.fn() };
    const controller = new AuthController(authService as any, auditService as any, rateLimit as any);
    const request = { headers: {}, socket: { remoteAddress: '203.0.113.10' } } as any;

    await expect(controller.login({ email: 'User@Example.com', password: 'never-log-this' }, request)).rejects.toEqual(
      expect.objectContaining({ response: expect.objectContaining({ message: 'Credenciais inválidas' }) }),
    );
    expect(auditService.record).toHaveBeenCalledWith({
      action: 'LOGIN_FAILED',
      entity: 'User',
      metadata: { identifierHash: 'account-hash', reason: 'INVALID_CREDENTIALS' },
    });
    expect(JSON.stringify(auditService.record.mock.calls)).not.toContain('never-log-this');
    expect(auditService.record).not.toHaveBeenCalledWith(expect.objectContaining({ action: 'LOGIN_RATE_LIMITED' }));
  });

  it('does not let an audit storage failure change the failed-login response', async () => {
    const authService = { validateUser: jest.fn().mockResolvedValue(null) };
    const auditService = { record: jest.fn().mockResolvedValue(null) };
    const rateLimit = { accountKey: jest.fn(() => 'account-hash'), ipKey: jest.fn(() => 'ip-hash'), consumeAttempt: jest.fn(), resetAccount: jest.fn() };
    const controller = new AuthController(authService as any, auditService as any, rateLimit as any);
    await expect(controller.login({ email: 'user@example.com', password: 'secret' }, { headers: {}, socket: { remoteAddress: '203.0.113.10' } } as any)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('applies rate limiting and resets the account counter after a successful login', async () => {
    const user = { id: 5, email: 'user@example.com', active: true };
    const authService = {
      validateUser: jest.fn().mockResolvedValue(user),
      login: jest.fn().mockResolvedValue({ access_token: 'jwt', user }),
    };
    const auditService = { record: jest.fn() };
    const rateLimit = { accountKey: jest.fn(() => 'account-hash'), ipKey: jest.fn(() => 'ip-hash'), consumeAttempt: jest.fn(), resetAccount: jest.fn() };
    const controller = new AuthController(authService as any, auditService as any, rateLimit as any);

    await expect(controller.login(
      { email: 'user@example.com', password: 'correct-password' },
      { headers: {}, socket: { remoteAddress: '203.0.113.10' } } as any,
    )).resolves.toEqual({ access_token: 'jwt', user });

    expect(rateLimit.consumeAttempt).toHaveBeenCalledWith('203.0.113.10', 'account-hash');
    expect(rateLimit.resetAccount).toHaveBeenCalledWith('account-hash');
    expect(authService.login).toHaveBeenCalledWith(user);
  });

  it('records only pseudonymous identifiers when rate limiting blocks the login', async () => {
    const email = 'blocked@example.com';
    const password = 'never-store-this-password';
    const ip = '203.0.113.10';
    const authService = { validateUser: jest.fn(), login: jest.fn() };
    const auditService = { record: jest.fn().mockResolvedValue({ id: 1 }) };
    const rateLimit = {
      accountKey: jest.fn(() => 'account-hash'),
      ipKey: jest.fn(() => 'ip-hash'),
      consumeAttempt: jest.fn().mockRejectedValue(new LoginRateLimitedException()),
      resetAccount: jest.fn(),
    };
    const controller = new AuthController(authService as any, auditService as any, rateLimit as any);

    await expect(controller.login(
      { email, password },
      { headers: {}, socket: { remoteAddress: ip } } as any,
    )).rejects.toMatchObject({ status: 429 });

    expect(auditService.record).toHaveBeenCalledTimes(1);
    expect(auditService.record).toHaveBeenCalledWith({
      action: 'LOGIN_RATE_LIMITED',
      entity: 'User',
      metadata: { identifierHash: 'account-hash', ipIdentifierHash: 'ip-hash', reason: 'RATE_LIMITED' },
    });
    const recorded = JSON.stringify(auditService.record.mock.calls);
    expect(recorded).not.toContain(email);
    expect(recorded).not.toContain(ip);
    expect(recorded).not.toContain(password);
    expect(recorded).not.toMatch(/token/i);
    expect(authService.validateUser).not.toHaveBeenCalled();
  });
});
