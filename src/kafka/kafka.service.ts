import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Admin,
  Consumer,
  EachMessagePayload,
  Kafka,
  Producer,
} from 'kafkajs';
import { IKafkaConfig } from 'src/config/kafka';

type KafkaMessageHandler = (payload: EachMessagePayload) => Promise<void>;

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private producer: Producer | null = null;
  private admin: Admin | null = null;
  private enabled = false;
  private kafka: Kafka | null = null;
  private consumers: Consumer[] = [];

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const cfg = this.configService.get<IKafkaConfig>('kafka', { infer: true });
    if (!cfg?.enabled) {
      this.logger.log('Kafka is disabled');
      return;
    }

    const kafka = new Kafka({
      clientId: cfg.clientId,
      brokers: cfg.brokers,
    });

    this.admin = kafka.admin();
    await this.admin.connect();
    await this.ensureTopics(cfg);

    this.producer = kafka.producer();
    await this.producer.connect();
    this.enabled = true;
    this.logger.log(`Kafka producer connected: ${cfg.brokers.join(',')}`);
    this.kafka = kafka;
  }

  async onModuleDestroy(): Promise<void> {
    for (const consumer of this.consumers) {
      await consumer.disconnect();
    }
    this.consumers = [];

    if (this.producer) {
      await this.producer.disconnect();
      this.producer = null;
    }

    if (this.admin) {
      await this.admin.disconnect();
      this.admin = null;
    }
  }

  async publish(topic: string, key: string, payload: unknown): Promise<void> {
    if (!this.enabled || !this.producer) return;

    await this.producer.send({
      topic,
      messages: [{ key, value: JSON.stringify(payload) }],
    });
  }

  getKafka(): Kafka {
    if (!this.kafka) {
      throw new Error('Kafka is not initialized');
    }
    return this.kafka;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async consume(
    groupId: string,
    topic: string,
    handler: KafkaMessageHandler,
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }
    const kafka = this.getKafka();
    const consumer = kafka.consumer({ groupId });

    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: true });
    await consumer.run({
      autoCommit: false,
      eachMessage: async (payload) => {
        await handler(payload);
        await consumer.commitOffsets([
          {
            topic: payload.topic,
            partition: payload.partition,
            offset: (BigInt(payload.message.offset) + 1n).toString(),
          },
        ]);
      },
    });

    this.consumers.push(consumer);
  }

  private async ensureTopics(cfg: IKafkaConfig): Promise<void> {
    if (!this.admin) {
      throw new Error('Kafka admin is not initialized');
    }

    const partitions = Number(this.configService.get<string>('KAFKA_TOPIC_PARTITIONS') ?? '3');
    const desiredTopic = cfg.topicOrdersEvents;
    if (!desiredTopic) {
      throw new Error('Kafka orders topic is not configured');
    }

    const metadata = await this.admin.fetchTopicMetadata();
    const existing = new Set(metadata.topics.map((t) => t.name));
    if (existing.has(desiredTopic)) {
      return;
    }

    await this.admin.createTopics({
      waitForLeaders: true,
      topics: [
        {
          topic: desiredTopic,
          numPartitions: partitions,
          replicationFactor: 1,
        },
      ],
    });

    this.logger.log(
      `Kafka topic ensured: ${desiredTopic} (partitions=${partitions})`,
    );
  }
}
