export interface IKafkaConfig {
  enabled: boolean;
  brokers: string[];
  clientId: string;
  topicOrdersEvents: string;
}
