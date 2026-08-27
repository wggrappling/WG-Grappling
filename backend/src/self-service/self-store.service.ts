import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductStatus } from '../../generated/prisma/enums';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUserContext } from './context/authenticated-user-context';

const publicProductSelect = {
  id: true,
  name: true,
  description: true,
  salePrice: true,
  availableQuantity: true,
} as const;

const cartSelect = {
  items: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      quantity: true,
      product: { select: { ...publicProductSelect, status: true } },
    },
  },
} as const;

@Injectable()
export class SelfStoreService {
  constructor(private readonly prisma: PrismaService) {}

  async getProducts() {
    const products = await this.prisma.product.findMany({
      where: { status: ProductStatus.ACTIVE },
      orderBy: { name: 'asc' },
      select: publicProductSelect,
    });
    return products.map((product) => this.projectProduct(product));
  }

  async getProduct(productId: number) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, status: ProductStatus.ACTIVE },
      select: publicProductSelect,
    });
    if (!product) throw new NotFoundException('Produto não encontrado.');
    return this.projectProduct(product);
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
    quantity: number,
  ) {
    const product = await this.getPurchasableProduct(productId, quantity);
    const cart = await this.prisma.cart.upsert({
      where: { studentId: context.studentId },
      create: { studentId: context.studentId },
      update: {},
      select: { id: true },
    });
    const current = await this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
      select: { quantity: true },
    });
    const nextQuantity = (current?.quantity ?? 0) + quantity;
    if (nextQuantity > product.availableQuantity) {
      throw new BadRequestException('Quantidade indisponível.');
    }
    await this.prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      create: { cartId: cart.id, productId, quantity },
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
    await this.getPurchasableProduct(item.productId, quantity);
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
        items: { select: { quantity: true } },
      },
    });
    return orders.map(({ items, ...order }) => ({
      ...order,
      subtotal: Number(order.subtotal),
      total: Number(order.total),
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
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
        items: {
          orderBy: { id: 'asc' },
          select: {
            id: true,
            productName: true,
            quantity: true,
            unitPrice: true,
            subtotal: true,
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    return {
      ...order,
      subtotal: Number(order.subtotal),
      total: Number(order.total),
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
      select: { id: true, productId: true },
    });
    if (!item) throw new NotFoundException('Item do carrinho não encontrado.');
    return item;
  }

  private async getPurchasableProduct(productId: number, quantity: number) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, status: ProductStatus.ACTIVE },
      select: { id: true, availableQuantity: true },
    });
    if (!product) throw new NotFoundException('Produto não encontrado.');
    if (quantity > product.availableQuantity) {
      throw new BadRequestException('Quantidade indisponível.');
    }
    return product;
  }

  private projectProduct(product: {
    id: number;
    name: string;
    description: string;
    salePrice: unknown;
    availableQuantity: number;
  }) {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: new Prisma.Decimal(String(product.salePrice)).toNumber(),
      available: product.availableQuantity > 0,
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
      availableQuantity: number;
      status: ProductStatus;
    };
  }>) {
    const projected = items.map((item) => {
      const price = new Prisma.Decimal(String(item.product.salePrice));
      const unitPrice = price.toNumber();
      return {
        id: item.id,
        quantity: item.quantity,
        unitPrice,
        subtotal: price.mul(item.quantity).toNumber(),
        available: item.product.status === ProductStatus.ACTIVE
          && item.quantity <= item.product.availableQuantity,
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
