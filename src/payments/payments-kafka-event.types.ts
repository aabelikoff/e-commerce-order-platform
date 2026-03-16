export const PAYMENT_EVENT_NAMES = {
  AUTHORIZED: 'PaymentAuthorized',
  CAPTURED: 'PaymentCaptured',
  FAILED: 'PaymentFailed'
} as const;

export type PaymentEventName = (typeof PAYMENT_EVENT_NAMES)[keyof typeof PAYMENT_EVENT_NAMES];

export const PAYMENT_EVENT_SCHEMA = {
  V1: 1,
  V2: 2
} as const;

export type PaymentEventSchemaVersion =
  (typeof PAYMENT_EVENT_SCHEMA)[keyof typeof PAYMENT_EVENT_SCHEMA];

export type PaymentLifecycleStatus = 'AUTHORIZED' | 'CAPTURED' | 'FAILED';

export type PaymentEventPayloadV1 = {
  paymentId: string;
  orderId: string;
  amount: string;
  currency: string;
  provider: string;
  status: PaymentLifecycleStatus;
};

export type PaymentEventPayloadV2 = PaymentEventPayloadV1 & {
  providerTransactionId?: string;
  failureReason?: string;
};

export type PaymentEventEnvelopeV1 = {
  eventName: PaymentEventName;
  schemaVersion: 1;
  eventId: string;
  occurredAt: string;
  payment: PaymentEventPayloadV1;
};

export type PaymentEventEnvelopeV2 = {
  eventName: PaymentEventName;
  schemaVersion: 2;
  eventId: string;
  occurredAt: string;
  payment: PaymentEventPayloadV2;
};

export type PaymentEventEnvelope = PaymentEventEnvelopeV1 | PaymentEventEnvelopeV2;

export type PaymentEventBaseData = {
  paymentId: string;
  orderId: string;
  amount: string;
  currency: string;
  provider: string;
};

