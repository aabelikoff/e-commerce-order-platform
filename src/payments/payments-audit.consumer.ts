import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EachMessagePayload } from 'kafkajs';
import { KafkaService } from 'src/kafka/kafka.service';
import { parsePaymentEvent } from './payments-events-normalizer';
import { IKafkaConfig } from 'src/config/kafka';

@Injectable()
export class PaymentsAuditConsumer implements OnApplicationBootstrap {
  private readonly logger = new Logger(PaymentsAuditConsumer.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly kafkaService: KafkaService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.kafkaService.isEnabled()) {
      this.logger.log('Kafka disabled, payments audit consumer skipped');
      return;
    }

    const topic = this.configService.get<IKafkaConfig['topicPaymentsEvents']>(
      'kafka.topicPaymentsEvents',
    );
    const groupId = this.configService.get<
      IKafkaConfig['paymentsAuditGroupId']
    >('kafka.paymentsAuditGroupId');
    if (!topic || !groupId) {
      this.logger.warn('Kafka payments audit topic/group is not configured');
      return;
    }

    await this.kafkaService.consume(groupId, topic, async (payload) => {
      await this.handleMessage(payload);
    });

    this.logger.log(
      `Payments audit consumer started (topic=${topic}, groupId=${groupId})`,
    );
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    if (!message.value) {
      return;
    }

    const event = parsePaymentEvent(message.value.toString('utf-8'));

    this.logger.log(
      `audit paymentEvent topic=${topic} partition=${partition} offset=${message.offset} eventId=${event.eventId} event=${event.eventName} paymentId=${event.payment.paymentId} status=${event.payment.status}`,
    );
  }
}
