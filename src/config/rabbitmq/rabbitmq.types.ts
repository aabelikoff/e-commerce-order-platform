export interface IRabbitMq {
  url: string;
  prefetch: number;
  maxAttempts: number;
  retryDelayMs: number;

  outbox_relay_interval: number;
  outbox_relay_batch_size: number;
}
