import { GUARDS_METADATA } from '@nestjs/common/constants';
import { UserRole } from '../../generated/prisma/enums';
import { ROLES_KEY } from '../auth/roles.decorator';
import { DashboardController } from './dashboard.controller';

describe('DashboardController RBAC', () => {
  const roles = Reflect.getMetadata(ROLES_KEY, DashboardController);

  it.each([UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION])('allows %s', (role) => {
    expect(roles).toContain(role);
  });

  it('blocks teachers by policy and uses authentication guards', () => {
    expect(roles).not.toContain(UserRole.TEACHER);
    expect(Reflect.getMetadata(GUARDS_METADATA, DashboardController)).toHaveLength(2);
  });
});
