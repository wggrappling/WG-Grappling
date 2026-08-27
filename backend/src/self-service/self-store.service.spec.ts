import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductStatus, StudentStatus, UserRole } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { SelfServiceCapability } from './context/student-access.policy';
import { SelfStoreService } from './self-store.service';

describe('SelfStoreService', () => {
  const prisma = {
    product: { findMany: jest.fn(), findFirst: jest.fn() },
    cart: { findUnique: jest.fn(), upsert: jest.fn() },
    cartItem: { findUnique: jest.fn(), findFirst: jest.fn(), upsert: jest.fn(), update: jest.fn(), delete: jest.fn() },
    order: { findMany: jest.fn(), findFirst: jest.fn() },
  };
  const service = new SelfStoreService(prisma as unknown as PrismaService);
  const context = {
    userId: 7,
    role: UserRole.ALUNO,
    studentId: 41,
    studentStatus: StudentStatus.ACTIVE,
    capabilities: [SelfServiceCapability.READ, SelfServiceCapability.OPERATE],
  } as const;

  beforeEach(() => jest.clearAllMocks());

  it('returns only public catalog fields and hides internal stock quantity', async () => {
    prisma.product.findMany.mockResolvedValue([{ id: 3, name: 'Kimono', description: 'Trançado', salePrice: '399.90', availableQuantity: 4 }]);
    await expect(service.getProducts()).resolves.toEqual([{ id: 3, name: 'Kimono', description: 'Trançado', price: 399.9, available: true }]);
    expect(prisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: ProductStatus.ACTIVE } }));
  });

  it('rejects unavailable or inactive products', async () => {
    prisma.product.findFirst.mockResolvedValueOnce(null);
    await expect(service.getProduct(99)).rejects.toThrow(NotFoundException);
    prisma.product.findFirst.mockResolvedValueOnce({ id: 3, availableQuantity: 1 });
    await expect(service.addCartItem(context, 3, 2)).rejects.toThrow(BadRequestException);
  });

  it('calculates cart prices from the current server-side product price', async () => {
    prisma.cart.findUnique.mockResolvedValue({ items: [{ id: 8, quantity: 2, product: { id: 3, name: 'Kimono', description: 'Trançado', salePrice: '399.90', availableQuantity: 4, status: ProductStatus.ACTIVE } }] });
    await expect(service.getCart(context)).resolves.toEqual({
      items: [{ id: 8, quantity: 2, unitPrice: 399.9, subtotal: 799.8, available: true, product: { id: 3, name: 'Kimono', description: 'Trançado' } }],
      subtotal: 799.8,
      total: 799.8,
    });
    expect(prisma.cart.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId: 41 } }));
  });

  it('derives cart ownership from context and ignores client pricing', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 3, availableQuantity: 5 });
    prisma.cart.upsert.mockResolvedValue({ id: 10 });
    prisma.cartItem.findUnique.mockResolvedValue(null);
    prisma.cartItem.upsert.mockResolvedValue({});
    prisma.cart.findUnique.mockResolvedValue({ items: [] });
    await service.addCartItem(context, 3, 2);
    expect(prisma.cart.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId: 41 }, create: { studentId: 41 } }));
    expect(prisma.cartItem.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { cartId: 10, productId: 3, quantity: 2 } }));
  });

  it('blocks cart-item IDOR with an ownership-filtered lookup', async () => {
    prisma.cartItem.findFirst.mockResolvedValue(null);
    await expect(service.updateCartItem(context, 500, 1)).rejects.toThrow(NotFoundException);
    expect(prisma.cartItem.findFirst).toHaveBeenCalledWith({ where: { id: 500, cart: { studentId: 41 } }, select: { id: true, productId: true } });
  });

  it('returns only the authenticated student orders and blocks order IDOR', async () => {
    prisma.order.findMany.mockResolvedValue([]);
    prisma.order.findFirst.mockResolvedValue(null);
    await service.getOrders(context);
    await expect(service.getOrder(context, 77)).rejects.toThrow(NotFoundException);
    expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { studentId: 41 } }));
    expect(prisma.order.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 77, studentId: 41 } }));
  });
});
