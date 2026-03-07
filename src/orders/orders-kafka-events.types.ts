export const ORDER_EVENT_NAMES = {
  PLACED: 'OrderPlaced',
  //   PAID: 'OrderPaid',
  //   SHIPPED: 'OrderShipped',
} as const;

export type OrderEventName =
  (typeof ORDER_EVENT_NAMES)[keyof typeof ORDER_EVENT_NAMES];

export const ORDER_EVENT_SCHEMA_VERSION = {
  V1: 1,
} as const;

export type OrderEventSchemaVersion =
  (typeof ORDER_EVENT_SCHEMA_VERSION)[keyof typeof ORDER_EVENT_SCHEMA_VERSION];

export type OrderEventPayload = {
  orderId: string;
  userId: string;
  totalAmount: string;
  currency: string;
};

export type OrderEventEnvelopeV1 = {
  eventName: OrderEventName;
  schemaVersion: 1;
  eventId: string;
  occurredAt: string;
  order: OrderEventPayload;
};

export enum EOrderConsumers {
  ANALYTICS_CONSUMER = 'analytics-consumer',
  CRM_CONSUMER = 'crm-consumer',
}
