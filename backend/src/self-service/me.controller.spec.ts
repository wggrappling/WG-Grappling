import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../auth/roles.decorator';
import { UserRole } from '../../generated/prisma/enums';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { StudentStatus } from '../../generated/prisma/enums';
import { SelfServiceCapability } from './context/student-access.policy';

describe('MeController', () => {
  const service = { getMe: jest.fn(), getProfile: jest.fn() };
  const controller = new MeController(service as unknown as MeService);
  const context = {
    userId: 1,
    role: UserRole.ALUNO,
    studentId: 2,
    studentStatus: StudentStatus.ACTIVE,
    capabilities: [SelfServiceCapability.READ, SelfServiceCapability.OPERATE],
  } as const;

  beforeEach(() => jest.clearAllMocks());

  it('requires the explicit ALUNO role and all three guards', () => {
    expect(Reflect.getMetadata(ROLES_KEY, MeController)).toEqual([UserRole.ALUNO]);
    expect(Reflect.getMetadata(GUARDS_METADATA, MeController)).toHaveLength(3);
  });

  it('forwards only the server-authenticated context to GET /me', async () => {
    service.getMe.mockResolvedValue({ account: {}, student: {}, academicContext: { active: true } });
    await controller.getMe(context);
    expect(service.getMe).toHaveBeenCalledWith(context);
  });

  it('forwards only the server-authenticated context to GET /me/profile', async () => {
    service.getProfile.mockResolvedValue({ id: 2 });
    await controller.getProfile(context);
    expect(service.getProfile).toHaveBeenCalledWith(context);
  });
});
