import { Injectable } from '@nestjs/common';
import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  Registry,
} from 'prom-client';

type HttpMetricLabels = {
  method: string;
  route: string;
  status: string;
};

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();

  private readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'] as const,
    registers: [this.registry],
  });

  private readonly httpRequestDurationSeconds = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    registers: [this.registry],
  });

  private readonly ordersCreatedTotal = new Counter({
    name: 'orders_created_total',
    help: 'Total number of successfully created orders',
    registers: [this.registry],
  });

  private readonly ordersFailedTotal = new Counter({
    name: 'orders_failed_total',
    help: 'Total number of failed order creation attempts',
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry });
  }

  recordHttpRequest(labels: HttpMetricLabels, durationSeconds: number): void {
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDurationSeconds.observe(labels, durationSeconds);
  }

  incrementOrdersCreated(): void {
    this.ordersCreatedTotal.inc();
  }

  incrementOrdersFailed(): void {
    this.ordersFailedTotal.inc();
  }

  getContentType(): string {
    return this.registry.contentType;
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
