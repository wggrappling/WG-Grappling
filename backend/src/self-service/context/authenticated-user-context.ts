import { StudentStatus, UserRole } from '../../../generated/prisma/enums';
import type { SelfServiceCapability } from './student-access.policy';

export type AuthenticatedUserContext = {
  userId: number;
  role: typeof UserRole.ALUNO;
  studentId: number;
  studentStatus: StudentStatus;
  capabilities: readonly SelfServiceCapability[];
};

export type AuthenticatedAccount = {
  id: number;
  role: UserRole;
  active: boolean;
};
