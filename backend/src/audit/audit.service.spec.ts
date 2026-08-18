import { AuditService, sanitizeAuditMetadata } from './audit.service';

describe('AuditService', () => {
  const prisma = {
    auditLog: { create: jest.fn(), count: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  let service: AuditService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuditService(prisma as any);
  });

  it('creates an audit log with the authenticated user', async () => {
    prisma.auditLog.create.mockResolvedValue({ id: 1 });
    await service.record({ userId: 7, action: 'UPDATE', entity: 'Student', entityId: '3', metadata: { status: 'ACTIVE' } });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 7, action: 'UPDATE', entity: 'Student', entityId: '3' }) });
  });

  it('never stores passwords, hashes, JWTs or tokens, including nested values', async () => {
    prisma.auditLog.create.mockResolvedValue({ id: 1 });
    await service.record({
      userId: 7,
      action: 'LOGIN_SUCCESS',
      entity: 'User',
      metadata: { password: 'secret', passwordHash: 'hash', token: 'token', jwt: 'jwt', authorization: 'Bearer jwt', safe: 'ok', nested: { access_token: 'jwt', name: 'Ana' } },
    });
    const metadata = prisma.auditLog.create.mock.calls[0][0].data.metadata;
    expect(metadata).toEqual({ safe: 'ok', nested: { name: 'Ana' } });
    expect(JSON.stringify(metadata)).not.toMatch(/secret|hash|token|jwt|Bearer/);
  });

  it('does not break the primary operation when logging fails', async () => {
    const warn = jest.fn();
    (service as any).logger.warn = warn;
    prisma.auditLog.create.mockRejectedValue(new Error('postgresql://admin:secret@database.example/wg'));
    await expect(service.record({ userId: 1, action: 'CREATE', entity: 'Student' })).resolves.toBeNull();
    expect(warn).toHaveBeenCalledWith('Falha ao registrar auditoria.');
    expect(JSON.stringify(warn.mock.calls)).not.toMatch(/postgresql|admin|secret|database\.example/);
  });

  it('queries audit logs with pagination and filters', async () => {
    prisma.$transaction.mockResolvedValue([3, [{ id: 3 }]]);
    const from = new Date('2026-08-01');
    const to = new Date('2026-08-31');
    const result = await service.findAll({ entity: 'Student', action: 'UPDATE', userId: 7, from, to, page: 2, pageSize: 10 });
    expect(prisma.auditLog.count).toHaveBeenCalledWith({ where: { entity: 'Student', action: 'UPDATE', userId: 7, createdAt: { gte: from, lte: to } } });
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
    expect(result).toEqual(expect.objectContaining({ total: 3, page: 2, pageSize: 10 }));
  });
});

describe('sanitizeAuditMetadata', () => {
  it('keeps useful primitive metadata', () => {
    expect(sanitizeAuditMetadata({ status: 'ACTIVE', ids: [1, 2] })).toEqual({ status: 'ACTIVE', ids: [1, 2] });
  });
});
