import { registerAs } from '@nestjs/config';
import { IRabbitMq } from './rabbitmq.types';

export const rabbitMQConfig = registerAs(
  'rabbitMq',
  (): IRabbitMq => ({
    url: process.env.RABBITMQ_URL ?? '',
    prefetch: Number(process.env.RABBITMQ_PREFETCH ?? '1'),
    maxAttempts: Number(process.env.RABBITMQ_MAX_ATTEMPTS ?? '3'),
    retryDelayMs: Number(process.env.RABBITMQ_RETRY_DELAY_MS ?? '5000'),
    outbox_relay_interval: Number(
      process.env.OUTBOX_RELAY_INTERVAL_MS ?? '1000',
    ),
    outbox_relay_batch_size: Number(
      process.env.OUTBOX_RELAY_BATCH_SIZE ?? '1000',
    ),
  }),
);
