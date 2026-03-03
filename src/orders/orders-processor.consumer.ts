import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import type { ConsumeMessage } from 'amqplib';
import { IRabbitMq } from '../config/rabbitmq';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import {
  ORDERS_DLQ_ROUTING_KEY,
  ORDERS_PROCESS_QUEUE,
  ORDERS_PROCESS_ROUTING_KEY,
} from '../rabbitmq/rabbitmq.topology';
import { EOrderStatus } from '../database/entities';
import { OrdersDlqMessage, OrdersProcessMessage } from './orders-queue.types';

@Injectable()
export class OrdersProcessorConsumer
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(OrdersProcessorConsumer.name);
  private consumerTag?: string;
  private readonly FACTOR = 2;
  private readonly MAX_DELAY_MS = 60_000;

  constructor(
    private readonly rabbitMqService: RabbitmqService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const channel = this.rabbitMqService.getChannel();
    const result = await channel.consume(
      ORDERS_PROCESS_QUEUE,
      (msg) => void this.onMessage(msg),
      { noAck: false },
    );
    this.consumerTag = result.consumerTag;
    this.logger.log(`Consumer started for queue=${ORDERS_PROCESS_QUEUE}`);
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.consumerTag) {
      return;
    }

    try {
      const channel = this.rabbitMqService.getChannel();
      await channel.cancel(this.consumerTag);
      this.logger.log(`Consumer stopped for queue=${ORDERS_PROCESS_QUEUE}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to cancel consumer for queue=${ORDERS_PROCESS_QUEUE}`,
        error?.stack ?? String(error),
      );
    }
  }

  private async onMessage(msg: ConsumeMessage | null): Promise<void> {
    if (!msg) {
      return;
    }

    const channel = this.rabbitMqService.getChannel();
    const parsed = this.parseMessage(msg);
    if (!parsed) {
      channel.ack(msg);
      return;
    }

    const { messageId, orderId } = parsed;
    const attempt = Number(parsed.attempt ?? 1);
    const maxAttempts =
      this.configService.get<IRabbitMq['maxAttempts']>(
        'rabbitMq.maxAttempts',
      ) ?? 3;
    const retryDelayMs =
      this.configService.get<IRabbitMq['retryDelayMs']>(
        'rabbitMq.retryDelayMs',
      ) ?? 1000;

    try {
      const processResult = await this.processOrder(parsed);
      channel.ack(msg);
      this.logger.log(
        `result=${processResult} messageId=${messageId} orderId=${orderId} attempt=${attempt}`,
      );
      return;
    } catch (error: any) {
      const reason = this.getErrorReason(error);

      if (attempt < maxAttempts) {
        const retryPayload: OrdersProcessMessage = {
          ...parsed,
          attempt: attempt + 1,
        };

        try {
          const backOffDelay = this.backOffTime(attempt, retryDelayMs);
          await this.delay(backOffDelay);
          await this.rabbitMqService.publish(
            ORDERS_PROCESS_ROUTING_KEY,
            retryPayload,
            { retryOf: messageId },
          );
          channel.ack(msg);
          this.logger.warn(
            `result=retry messageId=${messageId} orderId=${orderId} attempt=${attempt} reason="${reason}"`,
          );
          return;
        } catch (republishError: any) {
          this.logger.error(
            `result=retry_publish_failed messageId=${messageId} orderId=${orderId} attempt=${attempt} reason="${this.getErrorReason(republishError)}"`,
          );
          channel.nack(msg, false, true);
          return;
        }
      }

      try {
        await this.rabbitMqService.publish(
          ORDERS_DLQ_ROUTING_KEY,
          {
            ...parsed,
            failedAt: new Date().toISOString(),
            errorReason: reason,
          } as OrdersDlqMessage,
          { sourceQueue: ORDERS_PROCESS_QUEUE },
        );
        channel.ack(msg);
        this.logger.error(
          `result=dlq messageId=${messageId} orderId=${orderId} attempt=${attempt} reason="${reason}"`,
        );
      } catch (dlqError: any) {
        this.logger.error(
          `result=dlq_publish_failed messageId=${messageId} orderId=${orderId} attempt=${attempt} reason="${this.getErrorReason(dlqError)}"`,
        );
        channel.nack(msg, false, true);
      }
    }
  }

  private parseMessage(msg: ConsumeMessage): OrdersProcessMessage | null {
    try {
      const parsed = JSON.parse(msg.content.toString()) as OrdersProcessMessage;
      if (!parsed?.messageId || !parsed?.orderId) {
        throw new Error('messageId/orderId are required');
      }
      return parsed;
    } catch (error: any) {
      this.logger.error(
        `result=discard reason="invalid payload" raw="${msg.content.toString()}" error="${this.getErrorReason(error)}"`,
      );
      return null;
    }
  }

  private async processOrder(
    message: OrdersProcessMessage,
  ): Promise<'success' | 'duplicate'> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const inserted: Array<{ id: string }> = await qr.query(
        `
          INSERT INTO processed_messages (message_id, order_id, handler)
          VALUES ($1, $2, $3)
          ON CONFLICT (message_id) DO NOTHING
          RETURNING id
        `,
        [message.messageId, message.orderId, ORDERS_PROCESS_QUEUE],
      );

      if (inserted.length === 0) {
        await qr.commitTransaction();
        return 'duplicate';
      }

      if (message.simulate === 'alwaysFail') {
        throw new Error('Simulated worker error');
      }

      const updated: Array<{ id: string }> = await qr.query(
        `
          UPDATE orders
          SET status = $1,
              processed_at = COALESCE(processed_at, now())
          WHERE id = $2
          RETURNING id
        `,
        [EOrderStatus.PROCESSED, message.orderId],
      );

      if (updated.length === 0) {
        throw new Error(`Order not found: ${message.orderId}`);
      }

      await qr.commitTransaction();
      return 'success';
    } catch (error) {
      if (qr.isTransactionActive) {
        await qr.rollbackTransaction();
      }
      throw error;
    } finally {
      await qr.release();
    }
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private backOffTime(attempt: number, baseDelay: number) {
    return Math.min(
      baseDelay * this.FACTOR ** (attempt - 1),
      this.MAX_DELAY_MS,
    );
  }

  private getErrorReason(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
