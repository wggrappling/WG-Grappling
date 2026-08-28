import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../documents/storage/storage.service';
import { Prisma } from '../../generated/prisma/client';
import { CommercialPaymentMethod, CommercialPaymentStatus, OrderStatus, ProductStatus, UserRole } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import type { CancelOrderDto, CreateStoreOrderDto, CreateStoreProductDto, ManualPaymentDto, RefundPaymentDto, SelfCheckoutDto, StockEntryDto, UpdateStoreOrderStatusDto, UpdateStoreProductDto } from './dto/store.dto';

type Actor = { id: number; role: UserRole };
const money = (value: unknown) => new Prisma.Decimal(String(value));
const manualMethods: CommercialPaymentMethod[] = [CommercialPaymentMethod.PIX_MANUAL, CommercialPaymentMethod.CREDIT_CARD_PHYSICAL];

@Injectable()
export class StoreService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly storage: StorageService) {}

  async listProducts(actor?: Actor) {
    const canSeeCost = actor?.role === UserRole.OWNER || actor?.role === UserRole.ADMIN;
    const products = await this.prisma.product.findMany({ orderBy: { name: 'asc' }, include: { variants: { orderBy: [{ color: 'asc' }, { size: 'asc' }], include: { stockEntries: { orderBy: { createdAt: 'desc' }, take: 1, select: { unitCost: true } } } } } });
    return products.map((product) => ({ ...product, salePrice: money(product.salePrice).toNumber(), imageUrl: product.imageKey ? `/store/products/${product.id}/image` : null, variants: product.variants.map((variant) => ({ ...variant, ...(canSeeCost ? { latestUnitCost: variant.stockEntries[0] ? money(variant.stockEntries[0].unitCost).toNumber() : null } : {}), stockEntries: undefined, stockState: this.stockState(product.madeToOrder, variant.availableQuantity, variant.minimumStock) })) }));
  }

  async createProduct(dto: CreateStoreProductDto, actor: Actor) {
    const product = await this.prisma.product.create({ data: { name: dto.name.trim(), description: dto.description.trim(), type: dto.type, salePrice: dto.salePrice, madeToOrder: dto.madeToOrder, leadTimeDays: dto.leadTimeDays, status: dto.madeToOrder ? ProductStatus.MADE_TO_ORDER : ProductStatus.OUT_OF_STOCK, variants: { create: dto.variants.map((variant) => ({ color: variant.color?.trim() ?? '', size: variant.size?.trim() ?? '', minimumStock: variant.minimumStock })) } }, include: { variants: true } });
    await this.audit.record({ userId: actor.id, action: 'CREATE', entity: 'Product', entityId: String(product.id), metadata: { type: dto.type, salePrice: dto.salePrice } });
    return product;
  }

  async updateProduct(id: number, dto: UpdateStoreProductDto, actor: Actor) {
    const existing = await this.prisma.product.findUnique({ where: { id }, select: { id: true, salePrice: true } });
    if (!existing) throw new NotFoundException('Produto não encontrado.');
    const product = await this.prisma.product.update({ where: { id }, data: { ...dto, name: dto.name?.trim(), description: dto.description?.trim(), ...(dto.madeToOrder === true ? { status: ProductStatus.MADE_TO_ORDER } : {}) } });
    await this.audit.record({ userId: actor.id, action: 'UPDATE', entity: 'Product', entityId: String(id), metadata: { fields: Object.keys(dto), previousSalePrice: dto.salePrice === undefined ? undefined : money(existing.salePrice).toNumber(), salePrice: dto.salePrice } });
    return product;
  }

  async addVariant(productId: number, input: { color?: string; size?: string; minimumStock: number }, actor: Actor) {
    const variant = await this.prisma.productVariant.create({ data: { productId, color: input.color?.trim() ?? '', size: input.size?.trim() ?? '', minimumStock: input.minimumStock } });
    await this.audit.record({ userId: actor.id, action: 'CREATE_VARIANT', entity: 'Product', entityId: String(productId), metadata: { variantId: variant.id } });
    return variant;
  }

  async addStock(variantId: number, dto: StockEntryDto, actor: Actor) {
    const result = await this.prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({ where: { id: variantId }, include: { product: { select: { id: true, madeToOrder: true } } } });
      if (!variant) throw new NotFoundException('Variação não encontrada.');
      const updated = await tx.productVariant.update({ where: { id: variantId }, data: { availableQuantity: { increment: dto.quantity } } });
      const entry = await tx.stockEntry.create({ data: { variantId, quantity: dto.quantity, unitCost: dto.unitCost, recordedBy: actor.id } });
      if (!variant.product.madeToOrder) await tx.product.update({ where: { id: variant.product.id }, data: { status: ProductStatus.ACTIVE } });
      return { entry, availableQuantity: updated.availableQuantity };
    });
    await this.audit.record({ userId: actor.id, action: 'STOCK_ENTRY', entity: 'ProductVariant', entityId: String(variantId), metadata: { quantity: dto.quantity, unitCost: dto.unitCost } });
    return result;
  }

  async uploadProductImage(productId: number, file: { buffer: Buffer; mimetype: string; size: number }, actor: Actor) {
    if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) throw new BadRequestException('Imagem JPEG, PNG ou WebP obrigatória.');
    const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { imageKey: true } });
    if (!product) throw new NotFoundException('Produto não encontrado.');
    const key = `store-${productId}-${randomUUID()}`;
    await this.storage.save(key, file.buffer);
    try { await this.prisma.product.update({ where: { id: productId }, data: { imageKey: key, imageMimeType: file.mimetype } }); } catch (error) { await this.storage.delete(key); throw error; }
    if (product.imageKey) await this.storage.delete(product.imageKey);
    await this.audit.record({ userId: actor.id, action: 'UPDATE_IMAGE', entity: 'Product', entityId: String(productId) });
    return { imageUrl: `/store/products/${productId}/image` };
  }

  async getProductImage(productId: number) {
    const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { imageKey: true, imageMimeType: true } });
    if (!product?.imageKey || !product.imageMimeType) throw new NotFoundException('Imagem não encontrada.');
    return { data: await this.storage.get(product.imageKey), mimeType: product.imageMimeType };
  }

  async findCustomer(cpf: string) {
    const student = await this.findStudentByCpf(cpf);
    return { enrollmentNumber: student.enrollmentNumber, name: student.person.name, status: student.status };
  }

  private async findStudentByCpf(cpf: string) {
    const normalized = cpf.replace(/\D/g, '');
    if (normalized.length !== 11) throw new BadRequestException('CPF inválido.');
    const student = await this.prisma.student.findFirst({ where: { person: { cpf: normalized } }, select: { id: true, enrollmentNumber: true, status: true, person: { select: { name: true, cpf: true } } } });
    if (!student) throw new NotFoundException('Cliente não encontrado.');
    return student;
  }

  async createReceptionOrder(dto: CreateStoreOrderDto, actor: Actor) {
    const customer = await this.findStudentByCpf(dto.cpf);
    return this.createOrder(customer.id, dto.items, dto.paymentMethod, dto.paymentAmount, actor, dto.justification);
  }

  async createSelfOrder(studentId: number, dto: SelfCheckoutDto, actor: Actor) {
    const cart = await this.prisma.cart.findUnique({ where: { studentId }, select: { items: { select: { variantId: true, quantity: true } } } });
    if (!cart?.items.length) throw new BadRequestException('Carrinho vazio.');
    return this.createOrder(studentId, cart.items, dto.paymentMethod, dto.paymentAmount, actor);
  }

  private async createOrder(studentId: number, items: Array<{ variantId: number; quantity: number }>, method: CommercialPaymentMethod, amount: number, actor: Actor, justification?: string) {
    const underReview = manualMethods.includes(method) && actor.role !== UserRole.ALUNO;
    if (underReview && !justification?.trim()) throw new BadRequestException('Justificativa obrigatória.');
    const result = await this.prisma.$transaction(async (tx) => {
      const ids = [...new Set(items.map((item) => item.variantId))];
      const variants = await tx.productVariant.findMany({ where: { id: { in: ids }, active: true, product: { status: { in: [ProductStatus.ACTIVE, ProductStatus.MADE_TO_ORDER] } } }, include: { product: true } });
      if (variants.length !== ids.length) throw new BadRequestException('Produto ou variação indisponível.');
      const byId = new Map(variants.map((variant) => [variant.id, variant]));
      const snapshots = items.map((item) => { const variant = byId.get(item.variantId)!; if (!variant.product.madeToOrder && item.quantity > variant.availableQuantity) throw new ConflictException('Estoque insuficiente.'); const unitPrice = money(variant.product.salePrice); return { productId: variant.productId, variantId: variant.id, productName: variant.product.name, color: variant.color || null, size: variant.size || null, madeToOrder: variant.product.madeToOrder, quantity: item.quantity, unitPrice, subtotal: unitPrice.mul(item.quantity) }; });
      const total = snapshots.reduce((sum, item) => sum.plus(item.subtotal), money(0));
      if (money(amount).greaterThan(total)) throw new BadRequestException('Pagamento não pode superar o total.');
      const order = await tx.order.create({ data: { studentId, subtotal: total, total, status: underReview ? OrderStatus.PAYMENT_REVIEW : OrderStatus.PENDING_PAYMENT, items: { create: snapshots }, payments: { create: { method, amount, status: underReview ? CommercialPaymentStatus.UNDER_REVIEW : CommercialPaymentStatus.PENDING, justification: justification?.trim(), submittedBy: actor.id, submittedAt: new Date() } } }, select: { id: true, total: true, status: true } });
      if (actor.role === UserRole.ALUNO) await tx.cartItem.deleteMany({ where: { cart: { studentId } } });
      return { ...order, total: money(order.total).toNumber() };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await this.audit.record({ userId: actor.id, action: 'CREATE', entity: 'Order', entityId: String(result.id), metadata: { studentId, method } });
    return result;
  }

  async submitManualPayment(orderId: number, dto: ManualPaymentDto, actor: Actor) {
    if (!manualMethods.includes(dto.method)) throw new BadRequestException('Método exige confirmação eletrônica real.');
    const payment = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { payments: { where: { status: { in: [CommercialPaymentStatus.CONFIRMED, CommercialPaymentStatus.UNDER_REVIEW] } } } } });
      if (!order || order.status === OrderStatus.CANCELLED) throw new NotFoundException('Pedido não encontrado.');
      const committed = order.payments.reduce((sum, item) => sum.plus(item.amount), money(0));
      if (committed.plus(dto.amount).greaterThan(order.total)) throw new BadRequestException('Valor supera o saldo pendente.');
      const created = await tx.commercialPayment.create({ data: { orderId, method: dto.method, amount: dto.amount, status: CommercialPaymentStatus.UNDER_REVIEW, justification: dto.justification.trim(), submittedBy: actor.id, submittedAt: new Date() } });
      await tx.order.update({ where: { id: orderId }, data: { status: OrderStatus.PAYMENT_REVIEW } });
      return created;
    });
    await this.audit.record({ userId: actor.id, action: 'SUBMIT_PAYMENT_REVIEW', entity: 'CommercialPayment', entityId: String(payment.id), metadata: { orderId, amount: dto.amount } });
    return payment;
  }

  async listPaymentReviews() {
    return this.prisma.commercialPayment.findMany({ where: { status: CommercialPaymentStatus.UNDER_REVIEW }, orderBy: { createdAt: 'asc' }, select: { id: true, orderId: true, method: true, amount: true, justification: true, submittedAt: true, submitter: { select: { name: true, role: true } }, order: { select: { total: true, items: { select: { productName: true, color: true, size: true, quantity: true } }, student: { select: { enrollmentNumber: true, person: { select: { name: true } } } } } } } });
  }

  async listOrders() {
    const orders = await this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { enrollmentNumber: true, person: { select: { name: true } } } },
        items: { select: { id: true, productName: true, color: true, size: true, madeToOrder: true, quantity: true, unitPrice: true, subtotal: true, product: { select: { leadTimeDays: true } } } },
        payments: { select: { id: true, method: true, amount: true, status: true, createdAt: true } },
      },
    });
    return orders.map((order) => this.presentInternalOrder(order));
  }

  async getOrder(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        student: { select: { enrollmentNumber: true, person: { select: { name: true } } } },
        items: { select: { id: true, productName: true, color: true, size: true, madeToOrder: true, quantity: true, unitPrice: true, subtotal: true, product: { select: { leadTimeDays: true } } } },
        payments: { select: { id: true, method: true, amount: true, status: true, createdAt: true } },
      },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    return this.presentInternalOrder(order);
  }

  private presentInternalOrder(order: any) {
    const total = money(order.total).toNumber();
    const paid = order.payments.filter((payment: any) => payment.status === CommercialPaymentStatus.CONFIRMED).reduce((sum: Prisma.Decimal, payment: any) => sum.plus(payment.amount), money(0)).toNumber();
    return { ...order, subtotal: money(order.subtotal).toNumber(), total, paid, balance: Math.max(0, total - paid), items: order.items.map(({ product, ...item }: any) => ({ ...item, leadTimeDays: item.madeToOrder ? product.leadTimeDays : null, unitPrice: money(item.unitPrice).toNumber(), subtotal: money(item.subtotal).toNumber() })), payments: order.payments.map((payment: any) => ({ ...payment, amount: money(payment.amount).toNumber() })) };
  }

  async approvePayment(paymentId: number, notes: string | undefined, actor: Actor) {
    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.commercialPayment.findUnique({ where: { id: paymentId }, include: { order: { include: { items: true, payments: true } } } });
      if (!payment || payment.status !== CommercialPaymentStatus.UNDER_REVIEW) throw new ConflictException('Pagamento não está em análise.');
      if (payment.submittedBy === actor.id) throw new ConflictException('O solicitante não pode aprovar o próprio pagamento.');
      const confirmed = payment.order.payments.filter((item) => item.status === CommercialPaymentStatus.CONFIRMED).reduce((sum, item) => sum.plus(item.amount), money(payment.amount));
      let nextStatus: OrderStatus = payment.order.payments.some((item) => item.id !== paymentId && item.status === CommercialPaymentStatus.UNDER_REVIEW) ? OrderStatus.PAYMENT_REVIEW : OrderStatus.PENDING_PAYMENT;
      let released = false;
      if (confirmed.greaterThanOrEqualTo(payment.order.total) && !payment.order.stockReleasedAt) {
        for (const item of payment.order.items.filter((item) => !item.madeToOrder)) {
          const updated = await tx.productVariant.updateMany({ where: { id: item.variantId, availableQuantity: { gte: item.quantity } }, data: { availableQuantity: { decrement: item.quantity } } });
          if (updated.count !== 1) throw new ConflictException('Estoque insuficiente para confirmar a venda.');
        }
        for (const productId of [...new Set(payment.order.items.filter((item) => !item.madeToOrder).map((item) => item.productId))]) {
          const available = await tx.productVariant.count({ where: { productId, active: true, availableQuantity: { gt: 0 } } });
          if (available === 0) await tx.product.update({ where: { id: productId }, data: { status: ProductStatus.OUT_OF_STOCK } });
        }
        released = true;
        nextStatus = payment.order.items.some((item) => item.madeToOrder) ? OrderStatus.IN_PRODUCTION : OrderStatus.CONFIRMED;
      }
      await tx.commercialPayment.update({ where: { id: paymentId }, data: { status: CommercialPaymentStatus.CONFIRMED, reviewedBy: actor.id, reviewedAt: new Date(), reviewNotes: notes?.trim() } });
      await tx.order.update({ where: { id: payment.orderId }, data: { status: nextStatus, ...(released ? { stockReleasedAt: new Date() } : {}) } });
      return { paymentId, orderId: payment.orderId, orderStatus: nextStatus };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await this.audit.record({ userId: actor.id, action: 'APPROVE', entity: 'CommercialPayment', entityId: String(paymentId), metadata: result });
    return result;
  }

  async rejectPayment(paymentId: number, notes: string, actor: Actor) {
    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.commercialPayment.findUnique({
        where: { id: paymentId },
        include: { order: { include: { payments: true } } },
      });
      if (!payment || payment.status !== CommercialPaymentStatus.UNDER_REVIEW) {
        throw new ConflictException('Pagamento não está em análise.');
      }
      const hasOtherReview = payment.order.payments.some(
        (item) => item.id !== paymentId && item.status === CommercialPaymentStatus.UNDER_REVIEW,
      );
      await tx.commercialPayment.update({
        where: { id: paymentId },
        data: {
          status: CommercialPaymentStatus.FAILED,
          reviewedBy: actor.id,
          reviewedAt: new Date(),
          reviewNotes: notes.trim(),
        },
      });
      const orderStatus = hasOtherReview ? OrderStatus.PAYMENT_REVIEW : OrderStatus.PENDING_PAYMENT;
      await tx.order.update({ where: { id: payment.orderId }, data: { status: orderStatus } });
      return { paymentId, orderId: payment.orderId, orderStatus };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await this.audit.record({ userId: actor.id, action: 'REJECT', entity: 'CommercialPayment', entityId: String(paymentId), metadata: result });
    return result;
  }

  async updateOrderStatus(orderId: number, dto: UpdateStoreOrderStatusDto, actor: Actor) {
    const transitions: Partial<Record<OrderStatus, readonly OrderStatus[]>> = {
      [OrderStatus.CONFIRMED]: [OrderStatus.READY_FOR_PICKUP],
      [OrderStatus.IN_PRODUCTION]: [OrderStatus.AWAITING_DELIVERY],
      [OrderStatus.AWAITING_DELIVERY]: [OrderStatus.READY_FOR_PICKUP],
      [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.COMPLETED],
    };
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        status: true,
        stockReleasedAt: true,
        total: true,
        payments: { where: { status: CommercialPaymentStatus.CONFIRMED }, select: { amount: true } },
      },
    });
    if (!order?.stockReleasedAt) throw new ConflictException('Mercadoria não pode ser liberada sem pagamento confirmado.');
    const confirmed = order.payments.reduce((sum, payment) => sum.plus(payment.amount), money(0));
    if (confirmed.lessThan(order.total)) throw new ConflictException('Mercadoria não pode ser liberada sem quitação confirmada.');
    if (!transitions[order.status]?.includes(dto.status)) throw new BadRequestException('Transição operacional inválida.');
    const updated = await this.prisma.order.update({ where: { id: orderId }, data: { status: dto.status } });
    await this.audit.record({ userId: actor.id, action: 'UPDATE_STATUS', entity: 'Order', entityId: String(orderId), metadata: { from: order.status, to: dto.status } });
    return updated;
  }

  async cancelOrder(orderId: number, dto: CancelOrderDto, actor: Actor) {
    if (!dto.confirmFinancialImpact) throw new BadRequestException('Confirmação do impacto financeiro obrigatória.');
    const order = await this.prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!current || current.status === OrderStatus.CANCELLED) throw new NotFoundException('Pedido não encontrado ou já cancelado.');
      if (dto.restock && current.stockReleasedAt) for (const item of current.items.filter((item) => !item.madeToOrder)) await tx.productVariant.update({ where: { id: item.variantId }, data: { availableQuantity: { increment: item.quantity } } });
      await tx.commercialPayment.updateMany({ where: { orderId, status: { in: [CommercialPaymentStatus.PENDING, CommercialPaymentStatus.UNDER_REVIEW] } }, data: { status: CommercialPaymentStatus.CANCELLED } });
      return tx.order.update({ where: { id: orderId }, data: { status: OrderStatus.CANCELLED, cancelledAt: new Date(), cancelledBy: actor.id, cancellationReason: dto.reason.trim() } });
    });
    await this.audit.record({ userId: actor.id, action: 'CANCEL', entity: 'Order', entityId: String(orderId), metadata: { reason: dto.reason, restock: dto.restock } });
    return order;
  }

  async refundPayment(paymentId: number, dto: RefundPaymentDto, actor: Actor) {
    if (!dto.confirmFinancialImpact) throw new BadRequestException('Confirmação do impacto financeiro obrigatória.');
    const updated = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.commercialPayment.findUnique({
        where: { id: paymentId },
        include: { order: { include: { payments: true } } },
      });
      if (!payment || payment.status !== CommercialPaymentStatus.CONFIRMED || !manualMethods.includes(payment.method)) throw new ConflictException('Estorno manual indisponível para este pagamento.');
      const hasReview = payment.order.payments.some((item) => item.status === CommercialPaymentStatus.UNDER_REVIEW);
      const result = await tx.commercialPayment.update({ where: { id: paymentId }, data: { status: CommercialPaymentStatus.REFUNDED, refundedBy: actor.id, refundedAt: new Date(), refundReason: dto.reason.trim() } });
      await tx.order.update({ where: { id: payment.orderId }, data: { status: hasReview ? OrderStatus.PAYMENT_REVIEW : OrderStatus.PENDING_PAYMENT } });
      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await this.audit.record({ userId: actor.id, action: 'REFUND', entity: 'CommercialPayment', entityId: String(paymentId), metadata: { reason: dto.reason } });
    return updated;
  }

  private stockState(madeToOrder: boolean, quantity: number, minimum: number) { if (madeToOrder) return 'MADE_TO_ORDER'; if (quantity === 0) return 'OUT_OF_STOCK'; if (quantity <= minimum) return 'LOW_STOCK'; return 'NORMAL'; }
}
