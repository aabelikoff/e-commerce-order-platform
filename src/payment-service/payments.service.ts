import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Payment } from '../database/entities';
import { Repository } from 'typeorm';
import { toProtoStatus, toDbStatus } from './status.mapper';
import {
  AuthorizeRequest,
  AuthorizeResponse,
  GetPaymentStatusRequest,
  GetPaymentStatusResponse,
  CaptureRequest,
  OperationResponse,
  PaymentStatus,
  RefundRequest,
} from '../generated/payments/v1/payments';
import { DataSource } from 'typeorm';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private paymentsRepository: Repository<Payment>,
    private readonly dataSource: DataSource,
  ) {}

  async authorize(request: AuthorizeRequest): Promise<AuthorizeResponse> {
    this.validateAuthorizeRequest(request);
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const manager = qr.manager;
      const paymentRepository = manager.getRepository(Payment);

      const paymentExists = await paymentRepository.findOne({
        where: {
          orderId: request.orderId,
          idempotencyKey: request.idempotencyKey,
        },
      });

      if (paymentExists) {
        await qr.rollbackTransaction();
        return {
          paymentId: paymentExists.id,
          status: toProtoStatus(paymentExists.status),
          message: 'Payment already authorized',
        };
      }

      const payment = paymentRepository.create({
        idempotencyKey: request.idempotencyKey,
        status: toDbStatus(PaymentStatus.PAYMENT_STATUS_AUTHORIZED),
        orderId: request.orderId,
        paidAmount: request.total!.amount,
      });

      const savedPayment = await paymentRepository.save(payment);
      await qr.commitTransaction();

      return {
        paymentId: savedPayment.id,
        status: toProtoStatus(savedPayment.status),
        message: 'Payment authorized',
      };
    } catch (err) {
      if (qr.isTransactionActive) {
        await qr.rollbackTransaction();
      }
      throw err;
    } finally {
      await qr.release();
    }
  }

  private validateAuthorizeRequest(request: AuthorizeRequest): void {
    const { orderId, userId, total, idempotencyKey } = request;
    if (!orderId || !userId || !total || !idempotencyKey) {
      throw new Error('Invalid request for payment authorization');
    }
    const { amount, currency } = total;

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Invalid amount for Money in payment authorization');
    }
    if (!currency) {
      throw new Error('Invalid currency');
    }
  }

  async getPaymentStatus(
    request: GetPaymentStatusRequest,
  ): Promise<GetPaymentStatusResponse> {
    const payment = await this.paymentsRepository.findOne({
      where: { id: request.paymentId },
    });

    if (!payment) {
      throw new Error(`Payment ${request.paymentId} not found`);
    }

    return {
      paymentId: payment.id,
      status: toProtoStatus(payment.status),
      orderId: payment.orderId,
    };
  }

  async capture(request: CaptureRequest): Promise<OperationResponse> {
    if (!request.paymentId) {
      throw new Error('Empty payment id');
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const manager = qr.manager;
      const paymentRepository = manager.getRepository(Payment);

      const payment = await paymentRepository.findOne({
        where: { id: request.paymentId },
      });
      if (!payment) {
        throw new Error('Payment doesn`t exist');
      }

      if (
        toProtoStatus(payment.status) === PaymentStatus.PAYMENT_STATUS_CAPTURED
      ) {
        await qr.commitTransaction();
        return {
          ok: true,
          message: `Payment ${payment.id} already captured`,
        };
      }

      if (
        toProtoStatus(payment.status) !==
        PaymentStatus.PAYMENT_STATUS_AUTHORIZED
      ) {
        throw new Error(
          `Payment ${payment.id} is not in AUTHORIZED status and cannot be captured`,
        );
      }

      await paymentRepository.update(
        { id: request.paymentId },
        {
          status: toDbStatus(PaymentStatus.PAYMENT_STATUS_CAPTURED),
          paidAt: new Date(),
        },
      );
      await qr.commitTransaction();

      return {
        ok: true,
        message: `Payment ${payment.id} captured`,
      };
    } catch (error) {
      if (qr.isTransactionActive) {
        await qr.rollbackTransaction();
      }
      throw error;
    } finally {
      await qr.release();
    }
  }

  async refund(request: RefundRequest): Promise<OperationResponse> {
    if (!request.paymentId) {
      throw new Error('Empty payment id');
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const manager = qr.manager;
      const paymentRepository = manager.getRepository(Payment);

      const payment = await paymentRepository.findOne({
        where: { id: request.paymentId },
      });

      if (!payment) {
        throw new Error(`Payment ${request.paymentId} not found`);
      }

      if (
        toProtoStatus(payment.status) === PaymentStatus.PAYMENT_STATUS_REFUNDED
      ) {
        await qr.commitTransaction();
        return {
          ok: true,
          message: `Payment ${payment.id} already refunded`,
        };
      }

      if (
        toProtoStatus(payment.status) !== PaymentStatus.PAYMENT_STATUS_CAPTURED
      ) {
        throw new Error(
          `Payment ${payment.id} is not in CAPTURED status and cannot be refunded`,
        );
      }

      await paymentRepository.update(
        { id: request.paymentId },
        {
          status: toDbStatus(PaymentStatus.PAYMENT_STATUS_REFUNDED),
        },
      );

      await qr.commitTransaction();
      return {
        ok: true,
        message: `Payment ${payment.id} refunded`,
      };
    } catch (error) {
      if (qr.isTransactionActive) {
        await qr.rollbackTransaction();
      }
      throw error;
    } finally {
      await qr.release();
    }
  }
}
