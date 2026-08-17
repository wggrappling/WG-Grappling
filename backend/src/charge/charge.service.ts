import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ChargeStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChargeDto } from './dto/create-charge.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdateChargeDto } from './dto/update-charge.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { Prisma } from '../../generated/prisma/client';

const chargeInclude = { student: true, plan: true, payments: { orderBy: { paidAt: 'desc' as const } } };

@Injectable()
export class ChargeService {
  constructor(private readonly prisma: PrismaService) {}

  private withTotals<T extends { finalAmount: unknown; payments: Array<{ amount: unknown; refundedAt?: Date | null }> }>(charge: T) {
    const totalPaid = charge.payments
      .filter((payment) => !payment.refundedAt)
      .reduce((total, payment) => total.plus(new Prisma.Decimal(String(payment.amount))), new Prisma.Decimal(0));
    const balance = Prisma.Decimal.max(new Prisma.Decimal(0), new Prisma.Decimal(String(charge.finalAmount)).minus(totalPaid));
    return { ...charge, totalPaid: totalPaid.toNumber(), balance: balance.toNumber() };
  }

  async findAll(studentId?: number) {
    if (studentId !== undefined && (!Number.isInteger(studentId) || studentId <= 0)) {
      throw new BadRequestException('studentId inválido.');
    }
    const charges = await this.prisma.charge.findMany({
      where: studentId === undefined ? undefined : { studentId },
      include: chargeInclude,
    });
    return { module: 'Charges', total: charges.length, data: charges.map((charge) => this.withTotals(charge)) };
  }

  async findOne(id: number) {
    const charge = await this.prisma.charge.findUnique({ where: { id }, include: chargeInclude });
    return charge ? this.withTotals(charge) : null;
  }

  async findPayments(id: number) {
    const charge = await this.prisma.charge.findUnique({ where: { id }, select: { id: true } });
    if (!charge) throw new NotFoundException(`Cobrança com id ${id} não encontrada.`);
    return this.prisma.payment.findMany({ where: { chargeId: id }, orderBy: { paidAt: 'desc' } });
  }

  async markOverdue(now = new Date(), tx?: any) {
    const prismaClient = tx ?? this.prisma;
    return prismaClient.charge.updateMany({
      where: { status: ChargeStatus.PENDING, dueDate: { lt: now } },
      data: { status: ChargeStatus.OVERDUE },
    });
  }

  async registerPayment(id: number, dto: CreatePaymentDto, actorId?: number) {
    return this.prisma.$transaction(async (tx) => {
      const charge = await tx.charge.findUnique({ where: { id }, include: { payments: true } });
      if (!charge) throw new NotFoundException(`Cobrança com id ${id} não encontrada.`);
      if (charge.status === ChargeStatus.CANCELLED || charge.status === ChargeStatus.REFUNDED) {
        throw new ConflictException('Cobrança cancelada ou estornada não pode receber pagamento.');
      }

      const totalPaid = charge.payments.filter((payment) => !payment.refundedAt)
        .reduce((total, payment) => total.plus(payment.amount), new Prisma.Decimal(0));
      const finalAmount = new Prisma.Decimal(charge.finalAmount);
      const balance = finalAmount.minus(totalPaid);
      if (balance.lessThanOrEqualTo(0) || charge.status === ChargeStatus.PAID) {
        throw new ConflictException('Cobrança já está quitada.');
      }
      const paymentAmount = new Prisma.Decimal(dto.amount);
      if (paymentAmount.greaterThan(balance)) throw new BadRequestException('Pagamento não pode exceder o saldo da cobrança.');

      const payment = await tx.payment.create({
        data: { chargeId: id, amount: dto.amount, method: dto.method, paidAt: new Date(dto.paidAt), reference: dto.reference },
      });
      const updatedTotalPaid = totalPaid.plus(paymentAmount);
      const status = updatedTotalPaid.greaterThanOrEqualTo(finalAmount) ? ChargeStatus.PAID : ChargeStatus.PARTIALLY_PAID;
      await tx.charge.update({ where: { id }, data: { status } });
      if (actorId !== undefined) {
        await tx.auditLog.create({
          data: {
            userId: actorId,
            action: 'PAYMENT_REGISTERED',
            entity: 'Payment',
            entityId: String(payment.id),
            metadata: { chargeId: id, amount: dto.amount, method: dto.method, paidAt: dto.paidAt, resultingChargeStatus: status },
          },
        });
      }

      return {
        message: status === ChargeStatus.PAID ? 'Pagamento registrado e cobrança quitada.' : 'Pagamento parcial registrado.',
        data: { payment, chargeId: id, total: finalAmount.toNumber(), totalPaid: updatedTotalPaid.toNumber(), balance: finalAmount.minus(updatedTotalPaid).toNumber(), status },
      };
    }, { isolationLevel: 'Serializable' });
  }

  async refundPayment(id: number, dto: RefundPaymentDto, actorId: number) {
    const reason = dto.reason.trim();
    if (!reason) throw new BadRequestException('Motivo do estorno é obrigatório.');
    try {
      return await this.prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findUnique({ where: { id }, include: { charge: true } });
        if (!payment) throw new NotFoundException(`Pagamento com id ${id} não encontrado.`);
        if (payment.charge.status === ChargeStatus.CANCELLED || payment.charge.status === ChargeStatus.REFUNDED) {
          throw new ConflictException('Pagamento de cobrança cancelada ou estornada não pode ser estornado.');
        }
        if (payment.refundedAt) throw new ConflictException('Pagamento já foi estornado.');

        const refundedAt = new Date();
        const changed = await tx.payment.updateMany({
          where: { id, refundedAt: null }, data: { refundedAt, refundReason: reason, refundedBy: actorId },
        });
        if (changed.count !== 1) throw new ConflictException('Pagamento já foi estornado por outra operação.');

        const validPayments = await tx.payment.findMany({ where: { chargeId: payment.chargeId, refundedAt: null }, select: { amount: true } });
        const totalPaid = validPayments.reduce((total, item) => total.plus(item.amount), new Prisma.Decimal(0));
        const total = new Prisma.Decimal(payment.charge.finalAmount);
        const status = totalPaid.greaterThanOrEqualTo(total)
          ? ChargeStatus.PAID
          : totalPaid.greaterThan(0)
            ? ChargeStatus.PARTIALLY_PAID
            : payment.charge.dueDate < refundedAt ? ChargeStatus.OVERDUE : ChargeStatus.PENDING;
        await tx.charge.update({ where: { id: payment.chargeId }, data: { status } });
        const metadata = {
          chargeId: payment.chargeId, paymentId: payment.id, originalAmount: payment.amount,
          refundedAmount: payment.amount, reason, resultingChargeStatus: status,
        };
        await tx.auditLog.create({ data: { userId: actorId, action: 'PAYMENT_REFUNDED', entity: 'Payment', entityId: String(id), metadata } });
        await tx.auditLog.create({ data: { userId: actorId, action: 'FINANCIAL_CORRECTION', entity: 'Charge', entityId: String(payment.chargeId), metadata } });
        return {
          message: 'Pagamento estornado e cobrança recalculada.',
          data: { paymentId: id, chargeId: payment.chargeId, refundedAt, reason, totalPaid: totalPaid.toNumber(), balance: total.minus(totalPaid).toNumber(), status },
        };
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Estorno concorrente detectado; o pagamento deve ser recarregado.');
      }
      throw error;
    }
  }

  async create(dto: CreateChargeDto) {
    return this.prisma.charge.create({
      data: { ...dto, originalAmount: dto.originalAmount, discountAmount: dto.discountAmount ?? 0, finalAmount: dto.finalAmount, referenceMonth: dto.referenceMonth },
      include: chargeInclude,
    });
  }

  async update(id: number, dto: UpdateChargeDto) {
    const existing = await this.prisma.charge.findUnique({ where: { id }, include: { payments: true } });
    if (!existing) throw new NotFoundException(`Cobrança com id ${id} não encontrada.`);
    if (existing.status === ChargeStatus.PAID || existing.payments.length > 0) {
      throw new ConflictException('Cobrança com pagamento não pode ser alterada.');
    }
    return this.prisma.charge.update({ where: { id }, data: dto, include: chargeInclude });
  }

  async remove(id: number) {
    const existing = await this.prisma.charge.findUnique({ where: { id }, include: { payments: true } });
    if (!existing) throw new NotFoundException(`Cobrança com id ${id} não encontrada.`);
    if (existing.status === ChargeStatus.CANCELLED) return { message: 'Cobrança já estava cancelada.' };
    if (existing.status !== ChargeStatus.PENDING || existing.payments.length > 0) {
      throw new ConflictException('Somente cobrança pendente e sem pagamentos pode ser cancelada.');
    }
    await this.prisma.charge.update({ where: { id }, data: { status: ChargeStatus.CANCELLED } });
    return { message: 'Cobrança cancelada com sucesso!' };
  }
}
