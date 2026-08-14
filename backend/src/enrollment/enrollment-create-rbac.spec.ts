import { UserRole } from '../../generated/prisma/enums';
import { ROLES_KEY } from '../auth/roles.decorator';
import { EnrollmentController } from './enrollment.controller';

describe('Enrollment creation RBAC', () => {
  it('autoriza OWNER, ADMIN e RECEPTION e bloqueia TEACHER', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      EnrollmentController.prototype.create,
    );

    expect(roles).toEqual([
      UserRole.OWNER,
      UserRole.ADMIN,
      UserRole.RECEPTION,
    ]);
    expect(roles).not.toContain(UserRole.TEACHER);
  });
});
