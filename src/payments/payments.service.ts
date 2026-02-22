import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order, Payment } from 'src/database/entities';
import { Repository } from 'typeorm';
import { EPaymentStatus } from 'src/database/entities';
import { AuthUser } from 'src/auth/types';
import { ERoles } from 'src/auth/access/roles';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private paymentsRepository: Repository<Payment>,
    @InjectRepository(Order) private ordersRepository: Repository<Order>,
  ) { }
    

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
      return this.paymentsRepository.save(existing);
    }

    const payment = this.paymentsRepository.create({
      orderId,
      status: EPaymentStatus.PAID,
    });

    return this.paymentsRepository.save(payment);
  }
}
