import type { EOrderStatus } from "src/database/entities";

export type OrderStatusChangedEvent = {
    type: 'order.status_changed',
    version: number;
    orderId: string;
    userId?: string;
    fromStatus: EOrderStatus | null;
    toStatus: EOrderStatus;
    changedAt: string;
}

export type OrderEventsMetrics = {
  received: number;
  dedupDropped: number;
  emitted: number;
};