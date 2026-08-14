import { UserRole } from '../../generated/prisma/enums';
import { ROLES_KEY } from '../auth/roles.decorator';
import { ChargeController } from './charge.controller';

describe('Financial cycle RBAC', () => {
  it('restringe execução HTTP manual a OWNER e ADMIN', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, ChargeController.prototype.generateMonthlyCharges);
    expect(roles).toEqual([UserRole.OWNER, UserRole.ADMIN]);
    expect(roles).not.toContain(UserRole.RECEPTION);
    expect(roles).not.toContain(UserRole.TEACHER);
  });
});
