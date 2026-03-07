import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EachMessagePayload } from 'kafkajs';
import { IKafkaConfig } from 'src/config/kafka';
import { KafkaService } from 'src/kafka/kafka.service';
import { OrderEventEnvelopeV1 } from './orders-kafka-events.types';

@Injectable()
export class OrdersCrmConsumer implements OnApplicationBootstrap {
  private readonly logger = new Logger(OrdersCrmConsumer.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly kafkaService: KafkaService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.kafkaService.isEnabled()) {
      this.logger.log('Kafka disabled, orders crm consumer skipped');
      return;
    }

    const topic = this.configService.get<IKafkaConfig['topicOrdersEvents']>(
      'kafka.topicOrdersEvents',
    );
    if (!topic) {
      this.logger.warn('Kafka topic for orders events is not configured');
      return;
    }
    const groupId = this.configService.get<IKafkaConfig['ordersCrmGroupId']>(
      'kafka.ordersCrmGroupId',
    );
    if (!groupId) {
      this.logger.warn('Kafka orders CRM group is not configured');
      return;
    }

    await this.kafkaService.consume(groupId, topic, async (payload) => {
      await this.handleMessage(payload);
    });

    this.logger.log(
      `Orders crm consumer started (topic=${topic}, groupId=${groupId})`,
    );
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    if (!payload.message.value) {
      return;
    }

    const event = JSON.parse(
      payload.message.value.toString(),
    ) as OrderEventEnvelopeV1;

    if (event.eventName !== 'OrderPlaced') {
      return;
    }

    this.logger.log(
      `crm orderPlaced orderId=${event.order.orderId} eventId=${event.eventId} totalAmount=${event.order.totalAmount}`,
    );
  }
}
