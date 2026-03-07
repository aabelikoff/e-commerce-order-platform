import { registerAs } from '@nestjs/config';
import { IKafkaConfig } from './kafka.types';

export const kafkaConfig = registerAs(
  'kafka',
  (): IKafkaConfig => ({
    enabled: (process.env.KAFKA_ENABLED ?? 'false') === 'true',
    brokers: (process.env.KAFKA_BROKERS ?? '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean),
    clientId: process.env.KAFKA_CLIENT_ID ?? 'ecommerce-order-api',
    topicOrdersEvents: process.env.KAFKA_TOPIC_ORDERS_EVENTS ?? 'orders.events',
  }),
);
