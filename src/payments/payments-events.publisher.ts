import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { KafkaService } from '../kafka/kafka.service';
import {
  PAYMENT_EVENT_NAMES,
  PAYMENT_EVENT_SCHEMA,
  PaymentEventBaseData,
  PaymentEventEnvelope,
  PaymentEventName,
} from './payments-kafka-event.types';
import { IKafkaConfig } from 'src/config/kafka';

@Injectable()
export class PaymentsEventsPublisher {
  private readonly logger = new Logger(PaymentsEventsPublisher.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly kafkaService: KafkaService,
  ) {}

  async publishAuthorized(base: PaymentEventBaseData): Promise<void> {
    await this.publish(
      PAYMENT_EVENT_NAMES.AUTHORIZED,
      PAYMENT_EVENT_SCHEMA.V1,
      {
        ...base,
        status: 'AUTHORIZED',
      },
    );
  }

  async publishCaptured(
    base: PaymentEventBaseData,
    providerTransactionId?: string,
  ): Promise<void> {
    await this.publish(PAYMENT_EVENT_NAMES.CAPTURED, PAYMENT_EVENT_SCHEMA.V2, {
      ...base,
      status: 'CAPTURED',
      providerTransactionId,
    });
  }

  async publishFailed(
    base: PaymentEventBaseData,
    failureReason?: string,
  ): Promise<void> {
    await this.publish(PAYMENT_EVENT_NAMES.FAILED, PAYMENT_EVENT_SCHEMA.V2, {
      ...base,
      status: 'FAILED',
      failureReason,
    });
  }

  private async publish(
    eventName: PaymentEventName,
    schemaVersion: 1 | 2,
    payment: PaymentEventEnvelope['payment'],
  ): Promise<void> {
    if (!this.kafkaService.isEnabled()) {
      return;
    }

    const topic = this.configService.get<IKafkaConfig['topicPaymentsEvents']>(
      'kafka.topicPaymentsEvents',
    );
    if (!topic) {
      throw new Error('Kafka topic for payments events is not configured');
    }
    const orderId = String(payment.orderId);
    const eventId = randomUUID();

    const envelope: PaymentEventEnvelope = {
      eventName,
      schemaVersion,
      eventId,
      occurredAt: new Date().toISOString(),
      payment,
    };

    await this.kafkaService.publish(topic, orderId, envelope);

    this.logger.log(
      `Kafka published topic=${topic} key=${orderId} event=${eventName} eventId=${eventId} schemaVersion=${schemaVersion}`,
    );
  }
}
