import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Channel, ChannelModel, Options } from 'amqplib';
import * as amqp from 'amqplib';
import { IRabbitMq } from '../config/rabbitmq';
import {
  ORDERS_DLQ_QUEUE,
  ORDERS_DLQ_ROUTING_KEY,
  ORDERS_EXCHANGE,
  ORDERS_PROCESS_QUEUE,
  ORDERS_PROCESS_ROUTING_KEY,
  ORDERS_RETRY_QUEUE,
  ORDERS_RETRY_ROUTING_KEY,
} from './rabbitmq.topology';

@Injectable()
export class RabbitmqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitmqService.name);
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  constructor(private readonly configService: ConfigService) {}

  getChannel() {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }
    return this.channel;
  }

  async onModuleInit(): Promise<void> {
    const url = this.configService.getOrThrow<IRabbitMq['url']>('rabbitMq.url');
    const prefetch =
      this.configService.get<IRabbitMq['prefetch']>('rabbitMq.prefetch') ?? 1;

    const client = await amqp.connect(url);
    const channel = await client.createChannel();

    this.connection = client;
    this.channel = channel;

    await channel.prefetch(prefetch);
    await this.assertInfrastructure();
    this.logger.log('RabbitMQ channel initialized');
  }

  private async assertInfrastructure(): Promise<void> {
    const channel = this.getChannel();
    await channel.assertExchange(ORDERS_EXCHANGE, 'direct', { durable: true });
    await channel.assertQueue(ORDERS_PROCESS_QUEUE, { durable: true });
    await channel.assertQueue(ORDERS_RETRY_QUEUE, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': ORDERS_EXCHANGE,
        'x-dead-letter-routing-key': ORDERS_PROCESS_ROUTING_KEY,
      },
    });
    await channel.assertQueue(ORDERS_DLQ_QUEUE, { durable: true });
    await channel.bindQueue(
      ORDERS_PROCESS_QUEUE,
      ORDERS_EXCHANGE,
      ORDERS_PROCESS_ROUTING_KEY,
    );
    await channel.bindQueue(
      ORDERS_RETRY_QUEUE,
      ORDERS_EXCHANGE,
      ORDERS_RETRY_ROUTING_KEY,
    );
    await channel.bindQueue(ORDERS_DLQ_QUEUE, ORDERS_EXCHANGE, ORDERS_DLQ_ROUTING_KEY);
  }

  async publish(
    routingKey: string,
    payload: unknown,
    headers?: Record<string, unknown>,
    options?: Options.Publish,
  ): Promise<boolean> {
    const channel = this.getChannel();
    const content = Buffer.from(JSON.stringify(payload));
    return channel.publish(ORDERS_EXCHANGE, routingKey, content, {
      persistent: true,
      contentType: 'application/json',
      headers,
      ...options,
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
      this.channel = null;
    }
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
    this.logger.log('RabbitMQ connection closed');
  }
}
