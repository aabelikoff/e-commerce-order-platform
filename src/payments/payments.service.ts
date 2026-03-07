import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order, Payment } from 'src/database/entities';
import { Repository } from 'typeorm';
import { EPaymentStatus } from 'src/database/entities';
import { AuthUser } from 'src/auth/types';
import { ERoles } from 'src/auth/access/roles';
import { PaymentsEventsPublisher } from './payments-events.publisher';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment) private paymentsRepository: Repository<Payment>,
    @InjectRepository(Order) private ordersRepository: Repository<Order>,
    private readonly paymentsEventsPublisher: PaymentsEventsPublisher,
  ) {}

  async payOrder(orderId: string, user: AuthUser): Promise<Payment> {
    const isStaff = user.roles?.some(
      (role) => role === ERoles.ADMIN || role === ERoles.SUPPORT,
    );

    const orderQb = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoin('order.user', 'user')
      .where('order.id = :orderId', { orderId });

    if (!isStaff) {
      console.log('User is not staff, adding user filter to order query');
      orderQb.andWhere('user.id = :userId', { userId: user.sub });
    }

    const order = await orderQb.getOne();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const existing = await this.paymentsRepository.findOne({
      where: { orderId },
    });
    if (existing?.status === EPaymentStatus.PAID) return existing;

    if (existing) {
      existing.status = EPaymentStatus.PAID;
      existing.paidAt = existing.paidAt ?? new Date();
      existing.paidAmount = order.totalAmount;
      const saved = await this.paymentsRepository.save(existing);
      await this.publishCapturedEvent(saved, order);
      return saved;
    }

    const payment = this.paymentsRepository.create({
      orderId,
      status: EPaymentStatus.PAID,
      paidAt: new Date(),
      paidAmount: order.totalAmount,
    });

    const saved = await this.paymentsRepository.save(payment);
    await this.publishCapturedEvent(saved, order);
    return saved;
  }

  private async publishCapturedEvent(payment: Payment, order: Order): Promise<void> {
    try {
      await this.paymentsEventsPublisher.publishCaptured({
        paymentId: payment.id,
        orderId: order.id,
        amount: order.totalAmount,
        currency: 'USD',
        provider: 'mock',
      });
    } catch (error: unknown) {
      this.logger.warn(
        `Payment captured event publish failed (paymentId=${payment.id}, orderId=${order.id}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
