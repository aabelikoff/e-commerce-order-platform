export interface IRabbitMq {
  url: string;
  prefetch: number;
  maxAttempts: number;
  retryDelayMs: number;

  outboxRelayInterval: number;
  outboxRelayBatchSize: number;
}
