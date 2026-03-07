import { PaymentEventEnvelope, PaymentEventSchemaVersion } from './payments-kafka-event.types';

export type NormalizedPaymentEvent = {
  eventName: string;
  schemaVersion: PaymentEventSchemaVersion;
  eventId: string;
  occurredAt: Date;
  payment: {
    paymentId: string;
    orderId: string;
    amount: string;
    currency: string;
    provider: string;
    status: 'AUTHORIZED' | 'CAPTURED' | 'FAILED';
    providerTransactionId: string | null;
    failureReason: string | null;
  };
};

export function parsePaymentEvent(raw: string): NormalizedPaymentEvent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON in Kafka payment event');
  }

  const envelope = parsed as Partial<PaymentEventEnvelope>;
  if (!envelope || typeof envelope !== 'object') {
    throw new Error('Invalid payment event envelope');
  }

  const schemaVersion = Number(envelope.schemaVersion);
  if (schemaVersion !== 1 && schemaVersion !== 2) {
    throw new Error('Unsupported schemaVersion');
  }

  if (typeof envelope.eventName !== 'string' || !envelope.eventName) {
    throw new Error('eventName is required');
  }
  if (typeof envelope.eventId !== 'string' || !envelope.eventId) {
    throw new Error('eventId is required');
  }
  if (typeof envelope.occurredAt !== 'string' || !envelope.occurredAt) {
    throw new Error('occurredAt is required');
  }

  const occurredAt = new Date(envelope.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) {
    throw new Error('occurredAt has invalid format');
  }

  const payment = (envelope.payment ?? {}) as Record<string, unknown>;
  const paymentId = String(payment.paymentId ?? '');
  const orderId = String(payment.orderId ?? '');
  const amount = String(payment.amount ?? '0.00');
  const currency = String(payment.currency ?? 'USD');
  const provider = String(payment.provider ?? 'unknown');
  const status = String(payment.status ?? '');

  if (!paymentId || !orderId || !status) {
    throw new Error('payment payload is missing required fields');
  }
  if (status !== 'AUTHORIZED' && status !== 'CAPTURED' && status !== 'FAILED') {
    throw new Error('Unknown payment lifecycle status');
  }

  const providerTransactionId =
    typeof payment.providerTransactionId === 'string'
      ? payment.providerTransactionId
      : null;
  const failureReason = typeof payment.failureReason === 'string' ? payment.failureReason : null;

  return {
    eventName: envelope.eventName,
    schemaVersion,
    eventId: envelope.eventId,
    occurredAt,
    payment: {
      paymentId,
      orderId,
      amount,
      currency,
      provider,
      status,
      providerTransactionId,
      failureReason
    }
  };
}

