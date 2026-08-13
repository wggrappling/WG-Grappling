import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../auth/roles.decorator';
import { AuditController } from './audit.controller';

describe('AuditController RBAC', () => {
  it('allows only OWNER and ADMIN roles', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AuditController)).toEqual(['OWNER', 'ADMIN']);
    expect(Reflect.getMetadata(GUARDS_METADATA, AuditController)).toHaveLength(2);
  });

  it.each(['RECEPTION', 'TEACHER'])('does not authorize %s', (role) => {
    expect(Reflect.getMetadata(ROLES_KEY, AuditController)).not.toContain(role);
  });

  it('delegates the audit query', async () => {
    const service = { findAll: jest.fn().mockResolvedValue({ total: 0, data: [] }) };
    const controller = new AuditController(service as any);
    await expect(controller.findAll({ page: 1, pageSize: 20 })).resolves.toEqual({ total: 0, data: [] });
  });
});
