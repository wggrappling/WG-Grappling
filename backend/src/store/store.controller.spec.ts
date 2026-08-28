import { GUARDS_METADATA } from '@nestjs/common/constants';
import { UserRole } from '../../generated/prisma/enums';
import { ROLES_KEY } from '../auth/roles.decorator';
import { StoreController } from './store.controller';

describe('StoreController RBAC', () => {
  it('excludes PROFESSOR and ALUNO from internal store operations', () => {
    expect(Reflect.getMetadata(ROLES_KEY, StoreController)).toEqual([UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION]);
    expect(Reflect.getMetadata(GUARDS_METADATA, StoreController)).toHaveLength(2);
  });

  it.each(['approve', 'reject', 'refund', 'cancel', 'updateStatus', 'createProduct', 'addStock'] as const)('restricts %s to OWNER and ADMIN', (method) => {
    expect(Reflect.getMetadata(ROLES_KEY, StoreController.prototype[method])).toEqual([UserRole.OWNER, UserRole.ADMIN]);
  });

  it.each(['listOrders', 'getOrder', 'submitPayment'] as const)('allows the controller roles, including RECEPTION, to %s', (method) => {
    expect(Reflect.getMetadata(ROLES_KEY, StoreController.prototype[method])).toBeUndefined();
  });
});
