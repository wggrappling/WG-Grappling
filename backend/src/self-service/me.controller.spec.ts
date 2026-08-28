import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../auth/roles.decorator';
import { UserRole } from '../../generated/prisma/enums';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { StudentStatus } from '../../generated/prisma/enums';
import { SelfServiceCapability } from './context/student-access.policy';
import { SelfAcademicService } from './self-academic.service';
import { SelfStoreService } from './self-store.service';
import { StudentAccessPolicy } from './context/student-access.policy';
import { StoreService } from '../store/store.service';
import { SelfNoticeService } from './self-notice.service';
import { SelfDocumentService } from './self-document.service';
import { SelfScheduleService } from './self-schedule.service';

describe('MeController', () => {
  const service = { getMe: jest.fn(), getProfile: jest.fn() };
  const academic = {
    getGraduations: jest.fn(),
    getModalities: jest.fn(),
    getAttendance: jest.fn(),
    getFinance: jest.fn(),
  };
  const store = {
    getProducts: jest.fn(), getProduct: jest.fn(), getCart: jest.fn(),
    addCartItem: jest.fn(), updateCartItem: jest.fn(), removeCartItem: jest.fn(),
    getOrders: jest.fn(), getOrder: jest.fn(), getProductImage: jest.fn(),
  };
  const policy = { assertCapability: jest.fn() };
  const operations = { createSelfOrder: jest.fn() };
  const notices = { getNotices: jest.fn(), getNotice: jest.fn(), markRead: jest.fn() };
  const documents = { getDocuments: jest.fn(), getDocument: jest.fn(), getFile: jest.fn() };
  const schedule = { getSchedule: jest.fn() };
  const controller = new MeController(
    service as unknown as MeService,
    academic as unknown as SelfAcademicService,
    store as unknown as SelfStoreService,
    policy as unknown as StudentAccessPolicy,
    operations as unknown as StoreService,
    notices as unknown as SelfNoticeService,
    documents as unknown as SelfDocumentService,
    schedule as unknown as SelfScheduleService,
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

  it('never accepts studentId for store reads', async () => {
    store.getCart.mockResolvedValue({ items: [] });
    store.getOrders.mockResolvedValue([]);
    await controller.getCart(context);
    await controller.getOrders(context);
    expect(store.getCart).toHaveBeenCalledWith(context);
    expect(store.getOrders).toHaveBeenCalledWith(context);
  });

  it('uses the student catalog projection for product images', async () => {
    store.getProductImage.mockResolvedValue({ data: Buffer.from('image'), mimeType: 'image/png' });
    const response = { setHeader: jest.fn() };
    await controller.getStoreProductImage(3, response as never);
    expect(store.getProductImage).toHaveBeenCalledWith(3);
  });

  it('forwards only authenticated context and resource id for document reads', async () => {
    documents.getDocuments.mockResolvedValue([]);
    documents.getDocument.mockResolvedValue({ id: 12 });
    await controller.getDocuments(context);
    await controller.getDocument(context, 12);
    expect(documents.getDocuments).toHaveBeenCalledWith(context);
    expect(documents.getDocument).toHaveBeenCalledWith(context, 12);
  });

  it('forwards only authenticated context to the schedule projection', async () => {
    schedule.getSchedule.mockResolvedValue({ next: null, upcoming: [] });
    await controller.getSchedule(context);
    expect(schedule.getSchedule).toHaveBeenCalledWith(context);
  });

  it('requires operational capability before a cart mutation', async () => {
    const dto = { productId: 9, variantId: 21, quantity: 2 };
    store.addCartItem.mockResolvedValue({ items: [] });
    await controller.addCartItem(context, dto);
    expect(policy.assertCapability).toHaveBeenCalledWith(context, SelfServiceCapability.OPERATE);
    expect(store.addCartItem).toHaveBeenCalledWith(context, 9, 21, 2);
  });
});
