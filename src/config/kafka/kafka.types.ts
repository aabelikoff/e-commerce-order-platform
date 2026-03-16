export interface IKafkaConfig {
  enabled: boolean;
  brokers: string[];
  clientId: string;
  topicPartitions: number;
  topicOrdersEvents: string;
  ordersAnalyticsGroupId: string;
  ordersCrmGroupId: string;
  topicPaymentsEvents: string;
  paymentsAnalyticsGroupId: string;
  paymentsAuditGroupId: string;
}
