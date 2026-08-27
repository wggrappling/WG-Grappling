import { UserRole } from '../../../generated/prisma/enums';

export type AuthenticatedUserContext = {
  userId: number;
  role: typeof UserRole.ALUNO;
  studentId: number;
};

export type AuthenticatedAccount = {
  id: number;
  role: UserRole;
  active: boolean;
};
