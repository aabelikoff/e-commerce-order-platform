import {
  GatewayTimeoutException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order, Payment } from '../database/entities';
import { Repository } from 'typeorm';
import { EPaymentStatus } from '../database/entities';
import { AuthUser } from '../auth/types';
import { ERoles } from '../auth/access/roles';
import { PaymentsEventsPublisher } from './payments-events.publisher';
import { PAYMENTS_GRPC_CLIENT, PAYMENTS_SERVICE_NAME } from '../common/grpc/grpc.constants';
import { type ClientGrpc } from '@nestjs/microservices';
import { PaymentsClient } from '../generated/payments/v1/payments';
import { ConfigService } from '@nestjs/config';
import { IPaymentsServiceConfig } from 'src/config/payments-service';
import { lastValueFrom, TimeoutError, timeout } from 'rxjs';

@Injectable()
export class PaymentsService implements OnModuleInit{
  private readonly logger = new Logger(PaymentsService.name);
  private paymentsClient: PaymentsClient;

  constructor(
    @InjectRepository(Payment) private paymentsRepository: Repository<Payment>,
    @InjectRepository(Order) private ordersRepository: Repository<Order>,
    private readonly paymentsEventsPublisher: PaymentsEventsPublisher,
    private readonly configService: ConfigService,
    @Inject(PAYMENTS_GRPC_CLIENT)
    private readonly paymentsGrpcClient: ClientGrpc
  ) { }
  
  onModuleInit() {
      this.paymentsClient = this.paymentsGrpcClient.getService<PaymentsClient>(PAYMENTS_SERVICE_NAME)
    }

  async payOrder(orderId: string, user: AuthUser): Promise<Payment> {
    const isStaff = user.roles?.some(
      (role) => role === ERoles.ADMIN || role === ERoles.SUPPORT,
    );

    const orderQb = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoin('order.user', 'user')
      .where('order.id = :orderId', { orderId });

    if (!isStaff) {
      orderQb.andWhere('user.id = :userId', { userId: user.sub });
    }

    const order = await orderQb.getOne();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    let payment = await this.paymentsRepository.findOne({
      where: { orderId },
    });

    const paymentsTimeoutMs =
      this.configService.get<IPaymentsServiceConfig['paymentsGrpcTimeoutMs']>(
        'paymentsServiceConfig.paymentsGrpcTimeoutMs',
      ) ?? 2500;

    try {
      if (!payment) {
        const authorizeResult = await lastValueFrom(
          this.paymentsClient
            .authorize({
              orderId: order.id,
              userId: order.userId ?? user.sub,
              total: {
                amount: order.totalAmount,
                currency: 'USD',
              },
              idempotencyKey: order.idempotencyKey,
            })
            .pipe(timeout(paymentsTimeoutMs)),
        );

        payment = await this.paymentsRepository.findOne({
          where: { id: authorizeResult.paymentId },
        });

        if (!payment) {
          throw new NotFoundException(
            `Payment ${authorizeResult.paymentId} not found after authorization`,
          );
        }
      }

      if (payment.status === EPaymentStatus.PAID) {
        return payment;
      }

      const captureResult = await lastValueFrom(
        this.paymentsClient
          .capture({
            paymentId: payment.id,
          })
          .pipe(timeout(paymentsTimeoutMs)),
      );

      if (!captureResult.ok) {
        throw new ServiceUnavailableException(captureResult.message);
      }

      const updated = await this.paymentsRepository.findOne({
        where: { id: payment.id },
      });

      if (!updated) {
        throw new NotFoundException(`Payment ${payment.id} not found`);
      }

      await this.publishCapturedEvent(updated, order);
      return updated;
    } catch (error) {
      if (error instanceof TimeoutError) {
        throw new GatewayTimeoutException('Payments capture timeout');
      }
      if ((error as { code?: number })?.code !== undefined) {
        throw new ServiceUnavailableException('Payments service unavailable');
      }
      throw error;
    }
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
