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
    topicPartitions: Number(process.env.KAFKA_TOPIC_PARTITIONS ?? '3'),
    topicOrdersEvents: process.env.KAFKA_TOPIC_ORDERS_EVENTS ?? 'orders.events',
    ordersAnalyticsGroupId:
      process.env.KAFKA_ORDERS_ANALYTICS_GROUP_ID ?? 'orders-analytics',
    ordersCrmGroupId: process.env.KAFKA_ORDERS_CRM_GROUP_ID ?? 'orders-crm',
    topicPaymentsEvents:
      process.env.KAFKA_TOPIC_PAYMENTS_EVENTS ?? 'payments.events',
    paymentsAnalyticsGroupId:
      process.env.KAFKA_PAYMENTS_ANALYTICS_GROUP_ID ?? 'payments-analytics',
    paymentsAuditGroupId:
      process.env.KAFKA_PAYMENTS_AUDIT_GROUP_ID ?? 'payments-audit',
  }),
);
