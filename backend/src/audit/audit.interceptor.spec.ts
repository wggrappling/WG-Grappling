import { of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';

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
});
