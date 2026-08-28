import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductStatus } from '../../generated/prisma/enums';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../documents/storage/storage.service';
import type { AuthenticatedUserContext } from './context/authenticated-user-context';

const publicProductSelect = {
  id: true,
  name: true,
  description: true,
  type: true,
  salePrice: true,
  madeToOrder: true,
  leadTimeDays: true,
  imageKey: true,
  variants: { where: { active: true }, orderBy: [{ color: 'asc' as const }, { size: 'asc' as const }], select: { id: true, color: true, size: true, availableQuantity: true } },
} satisfies Prisma.ProductSelect;

const cartSelect = {
  items: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      quantity: true,
      product: { select: { id: true, name: true, description: true, salePrice: true, madeToOrder: true, status: true } },
      variant: { select: { id: true, color: true, size: true, availableQuantity: true, active: true } },
    },
  },
} as const;

@Injectable()
export class SelfStoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async getProducts() {
    const products = await this.prisma.product.findMany({
      where: { status: { in: [ProductStatus.ACTIVE, ProductStatus.MADE_TO_ORDER] } },
      orderBy: { name: 'asc' },
      select: publicProductSelect,
    });
    return products.map((product) => this.projectProduct(product));
  }

  async getProduct(productId: number) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, status: { in: [ProductStatus.ACTIVE, ProductStatus.MADE_TO_ORDER] } },
      select: publicProductSelect,
    });
    if (!product) throw new NotFoundException('Produto não encontrado.');
    return this.projectProduct(product);
  }

  async getProductImage(productId: number) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        status: { in: [ProductStatus.ACTIVE, ProductStatus.MADE_TO_ORDER] },
      },
      select: { imageKey: true, imageMimeType: true },
    });
    if (!product?.imageKey || !product.imageMimeType) {
      throw new NotFoundException('Imagem não encontrada.');
    }
    return {
      data: await this.storage.get(product.imageKey),
      mimeType: product.imageMimeType,
    };
  }

  async getCart(context: AuthenticatedUserContext) {
    const cart = await this.prisma.cart.findUnique({
      where: { studentId: context.studentId },
      select: cartSelect,
    });
    return this.projectCart(cart?.items ?? []);
  }

  async addCartItem(
    context: AuthenticatedUserContext,
    productId: number,
    variantId: number,
    quantity: number,
  ) {
    const variant = await this.getPurchasableVariant(productId, variantId, quantity);
    const cart = await this.prisma.cart.upsert({
      where: { studentId: context.studentId },
      create: { studentId: context.studentId },
      update: {},
      select: { id: true },
    });
    const current = await this.prisma.cartItem.findUnique({
      where: { cartId_productId_variantId: { cartId: cart.id, productId, variantId } },
      select: { quantity: true },
    });
    const nextQuantity = (current?.quantity ?? 0) + quantity;
    if (!variant.product.madeToOrder && nextQuantity > variant.availableQuantity) {
      throw new BadRequestException('Quantidade indisponível.');
    }
    await this.prisma.cartItem.upsert({
      where: { cartId_productId_variantId: { cartId: cart.id, productId, variantId } },
      create: { cartId: cart.id, productId, variantId, quantity },
      update: { quantity: nextQuantity },
    });
    return this.getCart(context);
  }

  async updateCartItem(
    context: AuthenticatedUserContext,
    itemId: number,
    quantity: number,
  ) {
    const item = await this.findOwnedCartItem(context.studentId, itemId);
    await this.getPurchasableVariant(item.productId, item.variantId, quantity);
    await this.prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
    return this.getCart(context);
  }

  async removeCartItem(context: AuthenticatedUserContext, itemId: number) {
    const item = await this.findOwnedCartItem(context.studentId, itemId);
    await this.prisma.cartItem.delete({ where: { id: item.id } });
    return this.getCart(context);
  }

  async getOrders(context: AuthenticatedUserContext) {
    const orders = await this.prisma.order.findMany({
      where: { studentId: context.studentId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        subtotal: true,
        total: true,
        status: true,
        createdAt: true,
        payments: { where: { status: 'CONFIRMED' }, select: { amount: true } },
        items: { select: { quantity: true } },
      },
    });
    return orders.map(({ items, payments, ...order }) => ({
      ...order,
      subtotal: Number(order.subtotal),
      total: Number(order.total),
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      paid: payments.reduce((sum, item) => sum.plus(item.amount), new Prisma.Decimal(0)).toNumber(),
      balance: Prisma.Decimal.max(0, new Prisma.Decimal(order.total).minus(payments.reduce((sum, item) => sum.plus(item.amount), new Prisma.Decimal(0)))).toNumber(),
    }));
  }

  async getOrder(context: AuthenticatedUserContext, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, studentId: context.studentId },
      select: {
        id: true,
        subtotal: true,
        total: true,
        status: true,
        createdAt: true,
        payments: { select: { id: true, method: true, amount: true, status: true, createdAt: true } },
        items: {
          orderBy: { id: 'asc' },
          select: {
            id: true,
            productName: true,
            quantity: true,
            unitPrice: true,
            subtotal: true,
            color: true,
            size: true,
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    const paid = order.payments.filter((payment) => payment.status === 'CONFIRMED').reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0));
    return {
      ...order,
      subtotal: Number(order.subtotal),
      total: Number(order.total),
      paid: paid.toNumber(),
      balance: Prisma.Decimal.max(0, new Prisma.Decimal(order.total).minus(paid)).toNumber(),
      payments: order.payments.map((payment) => ({ ...payment, amount: Number(payment.amount) })),
      items: order.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
      })),
    };
  }

  private async findOwnedCartItem(studentId: number, itemId: number) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cart: { studentId } },
      select: { id: true, productId: true, variantId: true },
    });
    if (!item) throw new NotFoundException('Item do carrinho não encontrado.');
    return item;
  }

  private async getPurchasableVariant(productId: number, variantId: number, quantity: number) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId, active: true, product: { status: { in: [ProductStatus.ACTIVE, ProductStatus.MADE_TO_ORDER] } } },
      select: { id: true, availableQuantity: true, product: { select: { madeToOrder: true } } },
    });
    if (!variant) throw new NotFoundException('Produto ou variação não encontrado.');
    if (!variant.product.madeToOrder && quantity > variant.availableQuantity) {
      throw new BadRequestException('Quantidade indisponível.');
    }
    return variant;
  }

  private projectProduct(product: {
    id: number;
    name: string;
    description: string;
    salePrice: unknown;
    type: string;
    madeToOrder: boolean;
    leadTimeDays: number;
    imageKey: string | null;
    variants: Array<{ id: number; color: string; size: string; availableQuantity: number }>;
  }) {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      type: product.type,
      price: new Prisma.Decimal(String(product.salePrice)).toNumber(),
      available: product.madeToOrder || product.variants.some((variant) => variant.availableQuantity > 0),
      madeToOrder: product.madeToOrder,
      leadTimeDays: product.leadTimeDays,
      imageUrl: product.imageKey ? `/me/store/products/${product.id}/image` : null,
      variants: product.variants.map((variant) => ({ id: variant.id, color: variant.color || null, size: variant.size || null, available: product.madeToOrder || variant.availableQuantity > 0 })),
    };
  }

  private projectCart(items: Array<{
    id: number;
    quantity: number;
    product: {
      id: number;
      name: string;
      description: string;
      salePrice: unknown;
      madeToOrder: boolean;
      status: ProductStatus;
    };
    variant: { id: number; color: string; size: string; availableQuantity: number; active: boolean };
  }>) {
    const projected = items.map((item) => {
      const price = new Prisma.Decimal(String(item.product.salePrice));
      const unitPrice = price.toNumber();
      return {
        id: item.id,
        quantity: item.quantity,
        unitPrice,
        subtotal: price.mul(item.quantity).toNumber(),
        available: item.variant.active && (item.product.madeToOrder || (item.product.status === ProductStatus.ACTIVE && item.quantity <= item.variant.availableQuantity)),
        variant: { id: item.variant.id, color: item.variant.color || null, size: item.variant.size || null },
        product: {
          id: item.product.id,
          name: item.product.name,
          description: item.product.description,
        },
      };
    });
    const total = items.reduce(
      (sum, item) => sum.plus(new Prisma.Decimal(String(item.product.salePrice)).mul(item.quantity)),
      new Prisma.Decimal(0),
    ).toNumber();
    return { items: projected, subtotal: total, total };
  }
}
