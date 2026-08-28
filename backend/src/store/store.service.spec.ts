import { ConflictException } from '@nestjs/common';
import { CommercialPaymentMethod, CommercialPaymentStatus, OrderStatus, ProductStatus, ProductType, StudentStatus, UserRole } from '../../generated/prisma/enums';
import { StoreService } from './store.service';

describe('StoreService operations', () => {
  const prisma: any = {
    product: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    productVariant: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn(), count: jest.fn() },
    stockEntry: { create: jest.fn() },
    student: { findFirst: jest.fn() },
    order: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    commercialPayment: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    cartItem: { deleteMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const audit = { record: jest.fn() };
  const storage = { save: jest.fn(), get: jest.fn(), delete: jest.fn() };
  const service = new StoreService(prisma, audit as any, storage as any);
  const admin = { id: 1, role: UserRole.ADMIN };
  const reception = { id: 2, role: UserRole.RECEPTION };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: (tx: any) => unknown) => callback(prisma));
    audit.record.mockResolvedValue({ id: 1 });
  });

  it('records stock entry cost history and increments only its variation', async () => {
    prisma.productVariant.findUnique.mockResolvedValue({ id: 7, productId: 3, availableQuantity: 2, product: { id: 3, madeToOrder: false } });
    prisma.productVariant.update.mockResolvedValue({ availableQuantity: 5 });
    prisma.stockEntry.create.mockResolvedValue({ id: 9, quantity: 3, unitCost: '42.50' });
    prisma.product.update.mockResolvedValue({});
    await expect(service.addStock(7, { quantity: 3, unitCost: 42.5 }, admin)).resolves.toMatchObject({ availableQuantity: 5 });
    expect(prisma.productVariant.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { availableQuantity: { increment: 3 } } });
    expect(prisma.stockEntry.create).toHaveBeenCalledWith({ data: { variantId: 7, quantity: 3, unitCost: 42.5, recordedBy: 1 } });
  });

  it('hides cost from RECEPTION while preserving it for ADMIN', async () => {
    prisma.product.findMany.mockResolvedValue([{ id: 3, salePrice: '100', imageKey: null, madeToOrder: false, variants: [{ id: 7, availableQuantity: 3, minimumStock: 5, stockEntries: [{ unitCost: '40' }] }] }]);
    const receptionView = await service.listProducts(reception);
    const adminView = await service.listProducts(admin);
    expect(receptionView[0].variants[0]).not.toHaveProperty('latestUnitCost');
    expect(adminView[0].variants[0]).toHaveProperty('latestUnitCost', 40);
  });

  it('creates a reception sale from CPF with server price and no client totals', async () => {
    prisma.student.findFirst.mockResolvedValue({ id: 41, enrollmentNumber: 'WG-41', status: StudentStatus.ACTIVE, person: { name: 'Ana', cpf: '52998224725' } });
    prisma.productVariant.findMany.mockResolvedValue([{ id: 7, productId: 3, color: 'Preto', size: 'M', availableQuantity: 5, active: true, product: { id: 3, name: 'Short', salePrice: '100', madeToOrder: false } }]);
    prisma.order.create.mockResolvedValue({ id: 12, total: '100', status: OrderStatus.PAYMENT_REVIEW });
    await service.createReceptionOrder({ cpf: '529.982.247-25', items: [{ variantId: 7, quantity: 1 }], paymentMethod: CommercialPaymentMethod.PIX_MANUAL, paymentAmount: 30, justification: 'Comprovante conferido' }, reception);
    expect(prisma.order.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ studentId: 41, subtotal: expect.anything(), total: expect.anything(), status: OrderStatus.PAYMENT_REVIEW }) }));
    const data = prisma.order.create.mock.calls[0][0].data;
    expect(data.items.create[0]).toMatchObject({ unitPrice: expect.anything(), subtotal: expect.anything(), quantity: 1, variantId: 7 });
    expect(data.payments.create).toMatchObject({ amount: 30, status: CommercialPaymentStatus.UNDER_REVIEW });
  });

  it('uses CPF only to locate and does not return it in the customer projection', async () => {
    prisma.student.findFirst.mockResolvedValue({ id: 41, enrollmentNumber: 'WG-41', status: StudentStatus.ACTIVE, person: { name: 'Ana', cpf: '52998224725' } });
    await expect(service.findCustomer('529.982.247-25')).resolves.toEqual({ enrollmentNumber: 'WG-41', name: 'Ana', status: StudentStatus.ACTIVE });
  });

  it('prevents the reception requester from approving their own payment', async () => {
    prisma.commercialPayment.findUnique.mockResolvedValue({ id: 5, orderId: 12, status: CommercialPaymentStatus.UNDER_REVIEW, submittedBy: 2, amount: '100', order: { total: '100', stockReleasedAt: null, items: [], payments: [] } });
    await expect(service.approvePayment(5, undefined, reception)).rejects.toThrow(ConflictException);
    expect(prisma.commercialPayment.update).not.toHaveBeenCalled();
  });

  it('accepts a second manual partial payment without trusting a client balance', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 12,
      total: '100',
      status: OrderStatus.PENDING_PAYMENT,
      payments: [{ amount: '30', status: CommercialPaymentStatus.CONFIRMED }],
    });
    prisma.commercialPayment.create.mockResolvedValue({ id: 6, orderId: 12, amount: '70' });
    prisma.order.update.mockResolvedValue({});
    await service.submitManualPayment(12, { method: CommercialPaymentMethod.CREDIT_CARD_PHYSICAL, amount: 70, justification: 'Comprovante apresentado' }, reception);
    expect(prisma.commercialPayment.create).toHaveBeenCalledWith({ data: expect.objectContaining({ orderId: 12, amount: 70, status: CommercialPaymentStatus.UNDER_REVIEW }) });
    expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: 12 }, data: { status: OrderStatus.PAYMENT_REVIEW } });
  });

  it('rejects only the payment under review and keeps the order pending', async () => {
    prisma.commercialPayment.findUnique.mockResolvedValue({
      id: 5,
      orderId: 12,
      status: CommercialPaymentStatus.UNDER_REVIEW,
      order: { payments: [{ id: 5, status: CommercialPaymentStatus.UNDER_REVIEW }] },
    });
    prisma.commercialPayment.update.mockResolvedValue({});
    prisma.order.update.mockResolvedValue({});
    await expect(service.rejectPayment(5, 'Comprovante inválido', admin)).resolves.toMatchObject({ orderStatus: OrderStatus.PENDING_PAYMENT });
    expect(prisma.commercialPayment.update).toHaveBeenCalledWith({ where: { id: 5 }, data: expect.objectContaining({ status: CommercialPaymentStatus.FAILED, reviewedBy: 1, reviewNotes: 'Comprovante inválido' }) });
    expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: 12 }, data: { status: OrderStatus.PENDING_PAYMENT } });
  });

  it('confirms payment and atomically decrements stock once', async () => {
    prisma.commercialPayment.findUnique.mockResolvedValue({ id: 5, orderId: 12, status: CommercialPaymentStatus.UNDER_REVIEW, submittedBy: 2, amount: '100', order: { total: '100', stockReleasedAt: null, items: [{ productId: 3, variantId: 7, quantity: 1, madeToOrder: false }], payments: [] } });
    prisma.productVariant.updateMany.mockResolvedValue({ count: 1 });
    prisma.productVariant.count.mockResolvedValue(1);
    prisma.commercialPayment.update.mockResolvedValue({});
    prisma.order.update.mockResolvedValue({});
    await expect(service.approvePayment(5, 'Validado', admin)).resolves.toMatchObject({ orderStatus: OrderStatus.CONFIRMED });
    expect(prisma.productVariant.updateMany).toHaveBeenCalledWith({ where: { id: 7, availableQuantity: { gte: 1 } }, data: { availableQuantity: { decrement: 1 } } });
    expect(prisma.order.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ stockReleasedAt: expect.any(Date) }) }));
  });

  it('rolls back confirmation when stock no longer exists', async () => {
    prisma.commercialPayment.findUnique.mockResolvedValue({ id: 5, orderId: 12, status: CommercialPaymentStatus.UNDER_REVIEW, submittedBy: 2, amount: '100', order: { total: '100', stockReleasedAt: null, items: [{ productId: 3, variantId: 7, quantity: 1, madeToOrder: false }], payments: [] } });
    prisma.productVariant.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.approvePayment(5, undefined, admin)).rejects.toThrow(ConflictException);
    expect(prisma.commercialPayment.update).not.toHaveBeenCalled();
  });

  it('allows only the next operational transition after stock release', async () => {
    prisma.order.findUnique.mockResolvedValue({ status: OrderStatus.CONFIRMED, stockReleasedAt: new Date(), total: '100', payments: [{ amount: '100' }] });
    prisma.order.update.mockResolvedValue({ id: 12, status: OrderStatus.READY_FOR_PICKUP });
    await expect(service.updateOrderStatus(12, { status: OrderStatus.READY_FOR_PICKUP }, admin)).resolves.toMatchObject({ status: OrderStatus.READY_FOR_PICKUP });
    await expect(service.updateOrderStatus(12, { status: OrderStatus.COMPLETED }, admin)).rejects.toThrow('Transição operacional inválida');
  });

  it('returns the order to payment pending after an authorized manual refund', async () => {
    prisma.commercialPayment.findUnique.mockResolvedValue({
      id: 5,
      orderId: 12,
      status: CommercialPaymentStatus.CONFIRMED,
      method: CommercialPaymentMethod.PIX_MANUAL,
      order: { payments: [{ id: 5, status: CommercialPaymentStatus.CONFIRMED }] },
    });
    prisma.commercialPayment.update.mockResolvedValue({ id: 5, status: CommercialPaymentStatus.REFUNDED });
    prisma.order.update.mockResolvedValue({});
    await expect(service.refundPayment(5, { reason: 'Devolução autorizada', confirmFinancialImpact: true }, admin)).resolves.toMatchObject({ status: CommercialPaymentStatus.REFUNDED });
    expect(prisma.order.update).toHaveBeenCalledWith({ where: { id: 12 }, data: { status: OrderStatus.PENDING_PAYMENT } });
  });

  it('creates made-to-order product with approved type and seven-day default', async () => {
    prisma.product.create.mockResolvedValue({ id: 3, variants: [] });
    await service.createProduct({ name: 'Conjunto', description: 'Personalizado', type: ProductType.SET, salePrice: 250, madeToOrder: true, leadTimeDays: 7, variants: [{ color: 'Preto', size: 'G', minimumStock: 0 }] }, admin);
    expect(prisma.product.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: ProductStatus.MADE_TO_ORDER, leadTimeDays: 7 }) }));
  });

  it('lists internal orders with server-calculated paid amount and balance', async () => {
    prisma.order.findMany.mockResolvedValue([{ id: 12, subtotal: '150', total: '150', status: OrderStatus.CONFIRMED, createdAt: new Date(), student: { enrollmentNumber: 'WG-41', person: { name: 'Ana' } }, items: [{ id: 1, productName: 'Short', color: 'Preto', size: 'M', madeToOrder: false, quantity: 1, unitPrice: '150', subtotal: '150', product: { leadTimeDays: 7 } }], payments: [{ id: 5, method: CommercialPaymentMethod.PIX_MANUAL, amount: '100', status: CommercialPaymentStatus.CONFIRMED, createdAt: new Date() }, { id: 6, method: CommercialPaymentMethod.PIX_MANUAL, amount: '50', status: CommercialPaymentStatus.UNDER_REVIEW, createdAt: new Date() }] }]);
    await expect(service.listOrders()).resolves.toMatchObject([{ id: 12, total: 150, paid: 100, balance: 50 }]);
  });
});
