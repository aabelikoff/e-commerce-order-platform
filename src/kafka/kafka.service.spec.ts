import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EachMessagePayload, Kafka } from 'kafkajs';
import { IKafkaConfig } from 'src/config/kafka';
import { KafkaService } from './kafka.service';

const mockAdmin = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  fetchTopicMetadata: jest.fn(),
  createTopics: jest.fn(),
};

const mockProducer = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  send: jest.fn(),
};

const mockConsumer = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  subscribe: jest.fn(),
  run: jest.fn(),
  commitOffsets: jest.fn(),
};

const mockKafkaInstance = {
  admin: jest.fn(() => mockAdmin),
  producer: jest.fn(() => mockProducer),
  consumer: jest.fn(() => mockConsumer),
};

const kafkaConstructorMock = jest.fn(
  (_config: unknown) => mockKafkaInstance,
);

jest.mock('kafkajs', () => ({
  Kafka: jest.fn((config: unknown) => kafkaConstructorMock(config)),
}));

describe('KafkaService', () => {
  let service: KafkaService;

  const enabledConfig: IKafkaConfig = {
    enabled: true,
    brokers: ['localhost:9092'],
    clientId: 'test-client',
    topicPartitions: 3,
    topicOrdersEvents: 'orders.events',
    ordersAnalyticsGroupId: 'orders-analytics',
    ordersCrmGroupId: 'orders-crm',
    topicPaymentsEvents: 'payments.events',
    paymentsAnalyticsGroupId: 'payments-analytics',
    paymentsAuditGroupId: 'payments-audit',
  };

  const createService = async (kafkaConfig?: Partial<IKafkaConfig>) => {
    const configServiceMock = {
      get: jest.fn((key: string) => {
        if (key === 'kafka') {
          return {
            ...enabledConfig,
            ...kafkaConfig,
          };
        }
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KafkaService,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    return {
      service: module.get<KafkaService>(KafkaService),
      configServiceMock,
    };
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockAdmin.connect.mockResolvedValue(undefined);
    mockAdmin.disconnect.mockResolvedValue(undefined);
    mockAdmin.fetchTopicMetadata.mockResolvedValue({ topics: [] });
    mockAdmin.createTopics.mockResolvedValue(true);

    mockProducer.connect.mockResolvedValue(undefined);
    mockProducer.disconnect.mockResolvedValue(undefined);
    mockProducer.send.mockResolvedValue(undefined);

    mockConsumer.connect.mockResolvedValue(undefined);
    mockConsumer.disconnect.mockResolvedValue(undefined);
    mockConsumer.subscribe.mockResolvedValue(undefined);
    mockConsumer.run.mockResolvedValue(undefined);
    mockConsumer.commitOffsets.mockResolvedValue(undefined);

    ({ service } = await createService());
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('does not initialize Kafka when disabled', async () => {
    const { service: disabledService } = await createService({
      enabled: false,
    });

    await disabledService.onModuleInit();

    expect(Kafka).not.toHaveBeenCalled();
    expect(disabledService.isEnabled()).toBe(false);
    expect(() => disabledService.getKafka()).toThrow(
      'Kafka is not initialized',
    );
  });

  it('initializes admin and producer when enabled', async () => {
    await service.onModuleInit();

    expect(Kafka).toHaveBeenCalledWith({
      clientId: 'test-client',
      brokers: ['localhost:9092'],
    });
    expect(mockKafkaInstance.admin).toHaveBeenCalled();
    expect(mockAdmin.connect).toHaveBeenCalled();
    expect(mockAdmin.fetchTopicMetadata).toHaveBeenCalled();
    expect(mockAdmin.createTopics).toHaveBeenCalledWith({
      waitForLeaders: true,
      topics: [
        {
          topic: 'orders.events',
          numPartitions: 3,
          replicationFactor: 1,
        },
      ],
    });
    expect(mockKafkaInstance.producer).toHaveBeenCalled();
    expect(mockProducer.connect).toHaveBeenCalled();
    expect(service.isEnabled()).toBe(true);
    expect(service.getKafka()).toBe(mockKafkaInstance);
  });

  it('does not create topic when it already exists', async () => {
    mockAdmin.fetchTopicMetadata.mockResolvedValue({
      topics: [{ name: 'orders.events' }],
    });

    await service.onModuleInit();

    expect(mockAdmin.createTopics).not.toHaveBeenCalled();
  });

  it('throws when enabled config has no orders topic', async () => {
    const { service: invalidService } = await createService({
      topicOrdersEvents: '',
    });

    await expect(invalidService.onModuleInit()).rejects.toThrow(
      'Kafka orders topic is not configured',
    );
  });

  it('does not publish when service is disabled', async () => {
    await service.publish('orders.events', 'order-1', { id: 'order-1' });

    expect(mockProducer.send).not.toHaveBeenCalled();
  });

  it('publishes JSON payload when enabled', async () => {
    await service.onModuleInit();

    await service.publish('orders.events', 'order-1', {
      id: 'order-1',
      status: 'placed',
    });

    expect(mockProducer.send).toHaveBeenCalledWith({
      topic: 'orders.events',
      messages: [
        {
          key: 'order-1',
          value: JSON.stringify({
            id: 'order-1',
            status: 'placed',
          }),
        },
      ],
    });
  });

  it('does not consume when service is disabled', async () => {
    const handler = jest.fn();

    await service.consume('group-1', 'orders.events', handler);

    expect(mockKafkaInstance.consumer).not.toHaveBeenCalled();
  });

  it('subscribes consumer and commits next offset after handling message', async () => {
    await service.onModuleInit();

    const handler = jest.fn().mockResolvedValue(undefined);

    await service.consume('group-1', 'orders.events', handler);

    expect(mockKafkaInstance.consumer).toHaveBeenCalledWith({
      groupId: 'group-1',
    });
    expect(mockConsumer.connect).toHaveBeenCalled();
    expect(mockConsumer.subscribe).toHaveBeenCalledWith({
      topic: 'orders.events',
      fromBeginning: true,
    });
    expect(mockConsumer.run).toHaveBeenCalledWith({
      autoCommit: false,
      eachMessage: expect.any(Function),
    });

    const runArgs = mockConsumer.run.mock.calls[0][0] as {
      eachMessage: (payload: EachMessagePayload) => Promise<void>;
    };
    const payload = {
      topic: 'orders.events',
      partition: 1,
      message: {
        offset: '41',
      },
    } as EachMessagePayload;

    await runArgs.eachMessage(payload);

    expect(handler).toHaveBeenCalledWith(payload);
    expect(mockConsumer.commitOffsets).toHaveBeenCalledWith([
      {
        topic: 'orders.events',
        partition: 1,
        offset: '42',
      },
    ]);
  });

  it('disconnects consumers, producer and admin on destroy', async () => {
    await service.onModuleInit();
    await service.consume('group-1', 'orders.events', jest.fn());

    await service.onModuleDestroy();

    expect(mockConsumer.disconnect).toHaveBeenCalled();
    expect(mockProducer.disconnect).toHaveBeenCalled();
    expect(mockAdmin.disconnect).toHaveBeenCalled();
  });
});
