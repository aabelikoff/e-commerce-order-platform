import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order, Payment } from 'src/database/entities';
import { Repository } from 'typeorm';
import { EPaymentStatus } from 'src/database/entities';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private paymentsRepository: Repository<Payment>,
  ) {}

  async payOrder(orderId: string) {
    const existing = await this.paymentsRepository.findOne({
      where: { orderId },
    });
    if (existing?.status === EPaymentStatus.PAID) {
      return existing;
    }

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
