import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../auth/roles.decorator';
import { UserRole } from '../../generated/prisma/enums';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { StudentStatus } from '../../generated/prisma/enums';
import { SelfServiceCapability } from './context/student-access.policy';
import { SelfAcademicService } from './self-academic.service';

describe('MeController', () => {
  const service = { getMe: jest.fn(), getProfile: jest.fn() };
  const academic = {
    getGraduations: jest.fn(),
    getModalities: jest.fn(),
    getAttendance: jest.fn(),
    getFinance: jest.fn(),
  };
  const controller = new MeController(
    service as unknown as MeService,
    academic as unknown as SelfAcademicService,
  );
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

  it.each([
    ['graduations', 'getGraduations'],
    ['modalities', 'getModalities'],
    ['finance', 'getFinance'],
  ] as const)('forwards only server context to GET /me/%s', async (_route, method) => {
    academic[method].mockResolvedValue({});
    await controller[method](context);
    expect(academic[method]).toHaveBeenCalledWith(context);
  });

  it('forwards only the allowed attendance query fields', async () => {
    const query = { startDate: '2026-01-01', endDate: '2026-01-31' };
    academic.getAttendance.mockResolvedValue({ records: [] });
    await controller.getAttendance(context, query);
    expect(academic.getAttendance).toHaveBeenCalledWith(context, query);
  });
});
