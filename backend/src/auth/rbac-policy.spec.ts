import { ROLES_KEY } from './roles.decorator';
import { ChargeController } from '../charge/charge.controller';
import { DocumentsController } from '../documents/documents.controller';
import { UsersController } from '../users/users.controller';
import { UserRole } from '../../generated/prisma/enums';

describe('RBAC endpoint policy', () => {
  const rolesFor = (target: object, method?: string) => Reflect.getMetadata(ROLES_KEY, method ? (target as any)[method] : target);

  it('allows reception to register payments and denies teachers by omission', () => {
    const roles = rolesFor(ChargeController.prototype, 'registerPayment');
    expect(roles).toContain(UserRole.RECEPTION);
    expect(roles).not.toContain(UserRole.TEACHER);
  });

  it('keeps personal documents unavailable to teachers', () => {
    const roles = rolesFor(DocumentsController);
    expect(roles).toEqual(expect.arrayContaining([UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION]));
    expect(roles).not.toContain(UserRole.TEACHER);
  });

  it('restricts all user administration to owner and admin', () => {
    expect(rolesFor(UsersController)).toEqual([UserRole.OWNER, UserRole.ADMIN]);
  });
});
