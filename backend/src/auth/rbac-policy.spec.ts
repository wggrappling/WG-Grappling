import { ROLES_KEY } from './roles.decorator';
import { ChargeController, PaymentController } from '../charge/charge.controller';
import { DocumentsController } from '../documents/documents.controller';
import { UsersController } from '../users/users.controller';
import { UserRole } from '../../generated/prisma/enums';
import { AUDIT_KEY } from '../audit/audit.decorator';
import { StudentsController } from '../students/students.controller';
import { PlansController } from '../plans/plans.controller';
import { ModalityController } from '../modality/modality.controller';
import { ClassController } from '../class/class.controller';
import { AttendanceController } from '../attendance/attendance.controller';
import { GraduationController } from '../graduation/graduation.controller';
import { MeController } from '../self-service/me.controller';

describe('RBAC endpoint policy', () => {
  const rolesFor = (target: object, method?: string) => Reflect.getMetadata(ROLES_KEY, method ? (target as any)[method] : target);

  it('allows reception to register payments and denies teachers by omission', () => {
    const roles = rolesFor(ChargeController.prototype, 'registerPayment');
    expect(roles).toContain(UserRole.RECEPTION);
    expect(roles).not.toContain(UserRole.TEACHER);
  });

  it('allows owner, admin and reception to refund and blocks teachers', () => {
    const roles = rolesFor(PaymentController.prototype, 'refund');
    expect(roles).toEqual([UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION]);
    expect(roles).not.toContain(UserRole.TEACHER);
  });

  it('keeps personal documents unavailable to teachers', () => {
    const roles = rolesFor(DocumentsController);
    expect(roles).toEqual(expect.arrayContaining([UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION]));
    expect(roles).not.toContain(UserRole.TEACHER);
  });

  it('restricts all user administration to owner and admin', () => {
    expect(rolesFor(UsersController)).toEqual([UserRole.OWNER, UserRole.ADMIN]);
    expect(rolesFor(UsersController)).not.toContain(UserRole.ALUNO);
  });

  it('keeps /me exclusive to the explicit ALUNO context', () => {
    expect(rolesFor(MeController)).toEqual([UserRole.ALUNO]);
  });

  it.each([
    [StudentsController, 'create', 'CREATE', 'Student'],
    [StudentsController, 'update', 'UPDATE', 'Student'],
    [StudentsController, 'remove', 'DELETE', 'Student'],
    [PlansController, 'create', 'CREATE', 'Plan'],
    [PlansController, 'update', 'UPDATE', 'Plan'],
    [PlansController, 'remove', 'DELETE', 'Plan'],
    [ModalityController, 'create', 'CREATE', 'Modality'],
    [ModalityController, 'update', 'UPDATE', 'Modality'],
    [ModalityController, 'remove', 'DELETE', 'Modality'],
    [ClassController, 'create', 'CREATE', 'Class'],
    [ClassController, 'update', 'UPDATE', 'Class'],
    [ClassController, 'remove', 'DELETE', 'Class'],
    [AttendanceController, 'create', 'REGISTER', 'Attendance'],
    [AttendanceController, 'createBatch', 'REGISTER_BATCH', 'Attendance'],
    [AttendanceController, 'update', 'UPDATE', 'Attendance'],
    [AttendanceController, 'remove', 'DELETE', 'Attendance'],
    [DocumentsController, 'upload', 'UPLOAD', 'Document'],
    [DocumentsController, 'create', 'CREATE', 'Document'],
    [DocumentsController, 'update', 'UPDATE', 'Document'],
    [DocumentsController, 'remove', 'DELETE', 'Document'],
    [GraduationController, 'create', 'CREATE', 'Graduation'],
    [GraduationController, 'update', 'UPDATE', 'Graduation'],
    [GraduationController, 'cancel', 'CANCEL', 'Graduation'],
    [ChargeController, 'create', 'CREATE', 'Charge'],
    [ChargeController, 'update', 'UPDATE', 'Charge'],
    [ChargeController, 'remove', 'CANCEL', 'Charge'],
  ])('audits %s.%s as %s/%s', (controller, method, action, entity) => {
    expect(Reflect.getMetadata(AUDIT_KEY, (controller as any).prototype[method as string])).toEqual(expect.objectContaining({ action, entity }));
  });

  it('allows teachers to record academic decisions but not correct or cancel history', () => {
    expect(rolesFor(GraduationController.prototype, 'create')).toContain(UserRole.TEACHER);
    expect(rolesFor(GraduationController.prototype, 'update')).toEqual([UserRole.OWNER, UserRole.ADMIN]);
    expect(rolesFor(GraduationController.prototype, 'cancel')).toEqual([UserRole.OWNER, UserRole.ADMIN]);
  });

  it('keeps reception and teacher permissions unchanged on administrative catalogs', () => {
    for (const controller of [PlansController, ModalityController, ClassController]) {
      for (const method of ['create', 'update', 'remove']) {
        const roles = rolesFor(controller.prototype, method);
        expect(roles).toEqual([UserRole.OWNER, UserRole.ADMIN]);
        expect(roles).not.toContain(UserRole.RECEPTION);
        expect(roles).not.toContain(UserRole.TEACHER);
      }
    }
  });
});
