import { GUARDS_METADATA } from '@nestjs/common/constants';
import { UserRole } from '../../generated/prisma/enums';
import { ROLES_KEY } from '../auth/roles.decorator';
import { ReportsController } from './reports.controller';

describe('ReportsController RBAC', () => {
  const roles = Reflect.getMetadata(ROLES_KEY, ReportsController);
  it.each([UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION])('allows %s', (role) => expect(roles).toContain(role));
  it('blocks TEACHER and uses authentication guards', () => {
    expect(roles).not.toContain(UserRole.TEACHER);
    expect(Reflect.getMetadata(GUARDS_METADATA, ReportsController)).toHaveLength(2);
  });
});
