import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { IRabbitMq } from '../config/rabbitmq';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import { OutboxService } from './outbox.service';
import { ORDERS_PROCESS_ROUTING_KEY } from 'src/rabbitmq/rabbitmq.topology';
import { KafkaService } from '../kafka/kafka.service';
import { OutboxEvent } from 'src/database/entities';
import { IKafkaConfig } from 'src/config/kafka';
import { OrderEventEnvelopeV1 } from 'src/orders/orders-kafka-events.types';

@Injectable()
export class OutboxRelayService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(OutboxRelayService.name);
  private timer: NodeJS.Timeout | null = null;
  private readonly FACTOR = 2;
  private readonly MAX_DELAY_MS = 60_000;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly outboxService: OutboxService,
    private readonly rabbitmqService: RabbitmqService,
    private readonly kafkaService: KafkaService,
  ) {}

  onApplicationBootstrap(): void {
    const intervalMs =
      this.configService.get<IRabbitMq['outboxRelayInterval']>(
        'rabbitMq.outboxRelayInterval',
      ) ?? 1000;

    this.timer = setInterval(() => {
      void this.relayTick().catch((err: unknown) => {
        this.logger.error(
          'Outbox relay tick failed',
          err instanceof Error ? err.stack : String(err),
        );
      });
    }, intervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
  private async publish(e: OutboxEvent) {
    switch (e.eventType) {
      case 'order.process_requested': {
        await this.rabbitmqService.publish(
          ORDERS_PROCESS_ROUTING_KEY,
          e.payload,
        );
        break;
      }
      case 'order.placed': {
        const topic = this.configService.get<IKafkaConfig['topicOrdersEvents']>(
          'kafka.topicOrdersEvents',
        );
        if (!topic) {
          throw new Error('Not specified topic');
        }
        const key = (e.payload as OrderEventEnvelopeV1)['order'][
          'orderId'
        ];
        if (!key) {
          throw new Error('Not specified orderId');
        }
        await this.kafkaService.publish(topic, key, e.payload);
        break;
      }
      default: {
        throw new Error('Unknown event');
      }
    }
  }

  async relayTick(): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const events = await this.outboxService.claimBatch(manager);

      for (const e of events) {
        try {
          
          await this.publish(e);

          await this.outboxService.markSent(e.id, manager);
        } catch (err: unknown) {
          const nextRetryAt = this.nextRetryAt(e.attempts + 1);
          const errorText = err instanceof Error ? err.message : String(err);
          await this.outboxService.markFailed(
            e.id,
            errorText,
            nextRetryAt,
            manager,
          );
          this.logger.warn(
            `Failed to publish outbox (id=${e.id}, attempts=${e.attempts})`,
          );
        }
      }
    });
  }

  private backOffTime(attempt: number, baseDelay: number): number {
    return Math.min(
      baseDelay * this.FACTOR ** (attempt - 1),
      this.MAX_DELAY_MS,
    );
  }

  private nextRetryAt(attempts: number): Date {
    const retryDelayMs =
      this.configService.get<IRabbitMq['retryDelayMs']>(
        'rabbitMq.retryDelayMs',
      ) ?? 1000;
    return new Date(Date.now() + this.backOffTime(attempts, retryDelayMs));
  }
}
