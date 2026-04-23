import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { EOutboxEventStatus, OutboxEvent } from 'src/database/entities';
import { KafkaService } from '../kafka/kafka.service';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import { OutboxRelayService } from './outbox-relay.service';
import { OutboxService } from './outbox.service';
import { ORDERS_PROCESS_ROUTING_KEY } from 'src/rabbitmq/rabbitmq.topology';

describe('OutboxRelayService', () => {
  let service: OutboxRelayService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(),
  };

  const mockOutboxService = {
    claimBatch: jest.fn(),
    markSent: jest.fn(),
    markFailed: jest.fn(),
  };

  const mockRabbitmqService = {
    publish: jest.fn(),
  };

  const mockKafkaService = {
    publish: jest.fn(),
  };

  const baseEvent = (overrides: Partial<OutboxEvent> = {}): OutboxEvent =>
    ({
      id: 'event-1',
      aggregateType: 'order',
      aggregateId: 'order-1',
      eventType: 'order.process_requested',
      payload: { orderId: 'order-1' },
      status: EOutboxEventStatus.PENDING,
      attempts: 0,
      nextRetryAt: null,
      lastError: null,
      sentAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      ...overrides,
    }) as unknown as OutboxEvent;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'rabbitMq.retryDelayMs') return 1000;
      if (key === 'rabbitMq.outboxRelayInterval') return 1000;
      if (key === 'kafka.topicOrdersEvents') return 'orders.events';
      return undefined;
    });
    mockRabbitmqService.publish.mockResolvedValue(undefined);
    mockKafkaService.publish.mockResolvedValue(undefined);
    mockOutboxService.claimBatch.mockResolvedValue([]);
    mockOutboxService.markSent.mockResolvedValue(undefined);
    mockOutboxService.markFailed.mockResolvedValue(undefined);

    mockDataSource.transaction.mockImplementation(
      async (callback: (manager: object) => Promise<unknown>) =>
        callback({ tx: true }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxRelayService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: OutboxService,
          useValue: mockOutboxService,
        },
        {
          provide: RabbitmqService,
          useValue: mockRabbitmqService,
        },
        {
          provide: KafkaService,
          useValue: mockKafkaService,
        },
      ],
    }).compile();

    service = module.get<OutboxRelayService>(OutboxRelayService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('publishes order.process_requested to RabbitMQ and marks event as sent', async () => {
    const manager = { tx: true };
    const event = baseEvent();
    mockDataSource.transaction.mockImplementation(
      async (callback: (txManager: object) => Promise<unknown>) =>
        callback(manager),
    );
    mockOutboxService.claimBatch.mockResolvedValue([event]);

    await service.relayTick();

    expect(mockOutboxService.claimBatch).toHaveBeenCalledWith(manager);
    expect(mockRabbitmqService.publish).toHaveBeenCalledWith(
      ORDERS_PROCESS_ROUTING_KEY,
      event.payload,
    );
    expect(mockOutboxService.markSent).toHaveBeenCalledWith(event.id, manager);
    expect(mockOutboxService.markFailed).not.toHaveBeenCalled();
  });

  it('publishes order.placed to Kafka and marks event as sent', async () => {
    const manager = { tx: true };
    const event = baseEvent({
      eventType: 'order.placed',
      payload: {
        order: {
          orderId: 'order-1',
        },
      },
    });

    mockDataSource.transaction.mockImplementation(
      async (callback: (txManager: object) => Promise<unknown>) =>
        callback(manager),
    );
    mockOutboxService.claimBatch.mockResolvedValue([event]);

    await service.relayTick();

    expect(mockKafkaService.publish).toHaveBeenCalledWith(
      'orders.events',
      'order-1',
      event.payload,
    );
    expect(mockOutboxService.markSent).toHaveBeenCalledWith(event.id, manager);
  });

  it('marks event as failed when RabbitMQ publish throws', async () => {
    const manager = { tx: true };
    const event = baseEvent({
      attempts: 2,
    });

    mockDataSource.transaction.mockImplementation(
      async (callback: (txManager: object) => Promise<unknown>) =>
        callback(manager),
    );
    mockOutboxService.claimBatch.mockResolvedValue([event]);
    mockRabbitmqService.publish.mockRejectedValue(new Error('queue down'));

    await service.relayTick();

    expect(mockOutboxService.markFailed).toHaveBeenCalledWith(
      event.id,
      'queue down',
      expect.any(Date),
      manager,
    );
    expect(mockOutboxService.markSent).not.toHaveBeenCalled();
  });

  it('marks event as failed when kafka topic is missing', async () => {
    const manager = { tx: true };
    const event = baseEvent({
      eventType: 'order.placed',
      payload: {
        order: {
          orderId: 'order-1',
        },
      },
    });

    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'rabbitMq.retryDelayMs') return 1000;
      if (key === 'rabbitMq.outboxRelayInterval') return 1000;
      if (key === 'kafka.topicOrdersEvents') return '';
      return undefined;
    });
    mockDataSource.transaction.mockImplementation(
      async (callback: (txManager: object) => Promise<unknown>) =>
        callback(manager),
    );
    mockOutboxService.claimBatch.mockResolvedValue([event]);

    await service.relayTick();

    expect(mockOutboxService.markFailed).toHaveBeenCalledWith(
      event.id,
      'Not specified topic',
      expect.any(Date),
      manager,
    );
  });

  it('marks event as failed when order.placed payload has no orderId', async () => {
    const manager = { tx: true };
    const event = baseEvent({
      eventType: 'order.placed',
      payload: {
        order: {},
      },
    });

    mockDataSource.transaction.mockImplementation(
      async (callback: (txManager: object) => Promise<unknown>) =>
        callback(manager),
    );
    mockOutboxService.claimBatch.mockResolvedValue([event]);

    await service.relayTick();

    expect(mockOutboxService.markFailed).toHaveBeenCalledWith(
      event.id,
      'Not specified orderId',
      expect.any(Date),
      manager,
    );
  });

  it('marks event as failed when event type is unknown', async () => {
    const manager = { tx: true };
    const event = baseEvent({
      eventType: 'unknown.event',
    });

    mockDataSource.transaction.mockImplementation(
      async (callback: (txManager: object) => Promise<unknown>) =>
        callback(manager),
    );
    mockOutboxService.claimBatch.mockResolvedValue([event]);

    await service.relayTick();

    expect(mockOutboxService.markFailed).toHaveBeenCalledWith(
      event.id,
      'Unknown event',
      expect.any(Date),
      manager,
    );
  });

  it('processes multiple events in one relay tick', async () => {
    const manager = { tx: true };
    const events = [
      baseEvent({ id: 'event-1' }),
      baseEvent({
        id: 'event-2',
        eventType: 'order.placed',
        payload: {
          order: {
            orderId: 'order-2',
          },
        },
      }),
    ];

    mockDataSource.transaction.mockImplementation(
      async (callback: (txManager: object) => Promise<unknown>) =>
        callback(manager),
    );
    mockOutboxService.claimBatch.mockResolvedValue(events);

    await service.relayTick();

    expect(mockOutboxService.markSent).toHaveBeenCalledTimes(2);
    expect(mockRabbitmqService.publish).toHaveBeenCalledTimes(1);
    expect(mockKafkaService.publish).toHaveBeenCalledTimes(1);
  });

  it('disconnects interval on module destroy', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    const timer = setInterval(() => undefined, 1000);
    (service as any).timer = timer;

    service.onModuleDestroy();

    expect(clearIntervalSpy).toHaveBeenCalledWith(timer);
    expect((service as any).timer).toBeNull();

    clearIntervalSpy.mockRestore();
  });
});
