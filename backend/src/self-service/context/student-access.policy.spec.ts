import { ForbiddenException } from '@nestjs/common';
import { StudentStatus, UserRole } from '../../../generated/prisma/enums';
import {
  SelfServiceCapability,
  StudentAccessPolicy,
} from './student-access.policy';

describe('StudentAccessPolicy', () => {
  const policy = new StudentAccessPolicy();

  it('grants ACTIVE Students read and operational capabilities', () => {
    expect(policy.capabilitiesFor(StudentStatus.ACTIVE)).toEqual([
      SelfServiceCapability.READ,
      SelfServiceCapability.OPERATE,
    ]);
  });

  it('grants PAUSED Students read-only access', () => {
    expect(policy.capabilitiesFor(StudentStatus.PAUSED)).toEqual([
      SelfServiceCapability.READ,
    ]);
  });

  it('returns 403 when a PAUSED Student attempts an operation', () => {
    const context = {
      userId: 7,
      role: UserRole.ALUNO,
      studentId: 41,
      studentStatus: StudentStatus.PAUSED,
      capabilities: [SelfServiceCapability.READ],
    } as const;

    expect(() =>
      policy.assertCapability(context, SelfServiceCapability.OPERATE),
    ).toThrow(ForbiddenException);
  });

  it('blocks INACTIVE Students from receiving capabilities', () => {
    expect(() => policy.capabilitiesFor(StudentStatus.INACTIVE)).toThrow(
      ForbiddenException,
    );
  });
});
