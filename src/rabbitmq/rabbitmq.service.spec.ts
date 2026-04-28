import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as amqp from 'amqplib';
import {
  ORDERS_DLQ_QUEUE,
  ORDERS_DLQ_ROUTING_KEY,
  ORDERS_EXCHANGE,
  ORDERS_PROCESS_QUEUE,
  ORDERS_PROCESS_ROUTING_KEY,
  ORDERS_RETRY_QUEUE,
  ORDERS_RETRY_ROUTING_KEY,
} from './rabbitmq.topology';
import { RabbitmqService } from './rabbitmq.service';

const mockChannel = {
  prefetch: jest.fn(),
  assertExchange: jest.fn(),
  assertQueue: jest.fn(),
  bindQueue: jest.fn(),
  publish: jest.fn(),
  close: jest.fn(),
};

const mockConnection = {
  createChannel: jest.fn(),
  close: jest.fn(),
};

const connectMock = jest.fn((_url: unknown) => mockConnection);

jest.mock('amqplib', () => ({
  connect: jest.fn((url: unknown) => connectMock(url)),
}));

describe('RabbitmqService', () => {
  let service: RabbitmqService;

  const createService = async (configValues?: {
    url?: string;
    prefetch?: number;
  }) => {
    const configServiceMock = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'rabbitMq.url') {
          return configValues?.url ?? 'amqp://localhost:5672';
        }
        throw new Error(`Unexpected config key: ${key}`);
      }),
      get: jest.fn((key: string) => {
        if (key === 'rabbitMq.prefetch') {
          return configValues?.prefetch;
        }
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RabbitmqService,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    return {
      service: module.get<RabbitmqService>(RabbitmqService),
      configServiceMock,
    };
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockConnection.createChannel.mockResolvedValue(mockChannel);
    mockConnection.close.mockResolvedValue(undefined);

    mockChannel.prefetch.mockResolvedValue(undefined);
    mockChannel.assertExchange.mockResolvedValue(undefined);
    mockChannel.assertQueue.mockResolvedValue(undefined);
    mockChannel.bindQueue.mockResolvedValue(undefined);
    mockChannel.publish.mockReturnValue(true);
    mockChannel.close.mockResolvedValue(undefined);

    connectMock.mockResolvedValue(mockConnection);

    ({ service } = await createService());
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws when getChannel is called before initialization', () => {
    expect(() => service.getChannel()).toThrow(
      'RabbitMQ channel is not initialized',
    );
  });

  it('connects, creates channel, applies prefetch and asserts topology on init', async () => {
    await service.onModuleInit();

    expect(amqp.connect).toHaveBeenCalledWith('amqp://localhost:5672');
    expect(mockConnection.createChannel).toHaveBeenCalled();
    expect(mockChannel.prefetch).toHaveBeenCalledWith(1);
    expect(mockChannel.assertExchange).toHaveBeenCalledWith(
      ORDERS_EXCHANGE,
      'direct',
      { durable: true },
    );
    expect(mockChannel.assertQueue).toHaveBeenNthCalledWith(
      1,
      ORDERS_PROCESS_QUEUE,
      {
        durable: true,
      },
    );
    expect(mockChannel.assertQueue).toHaveBeenNthCalledWith(
      2,
      ORDERS_RETRY_QUEUE,
      {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': ORDERS_EXCHANGE,
          'x-dead-letter-routing-key': ORDERS_PROCESS_ROUTING_KEY,
        },
      },
    );
    expect(mockChannel.assertQueue).toHaveBeenNthCalledWith(
      3,
      ORDERS_DLQ_QUEUE,
      {
        durable: true,
      },
    );
    expect(mockChannel.bindQueue).toHaveBeenNthCalledWith(
      1,
      ORDERS_PROCESS_QUEUE,
      ORDERS_EXCHANGE,
      ORDERS_PROCESS_ROUTING_KEY,
    );
    expect(mockChannel.bindQueue).toHaveBeenNthCalledWith(
      2,
      ORDERS_RETRY_QUEUE,
      ORDERS_EXCHANGE,
      ORDERS_RETRY_ROUTING_KEY,
    );
    expect(mockChannel.bindQueue).toHaveBeenNthCalledWith(
      3,
      ORDERS_DLQ_QUEUE,
      ORDERS_EXCHANGE,
      ORDERS_DLQ_ROUTING_KEY,
    );
    expect(service.getChannel()).toBe(mockChannel);
  });

  it('uses configured prefetch value when provided', async () => {
    const { service: configuredService } = await createService({
      prefetch: 7,
    });

    await configuredService.onModuleInit();

    expect(mockChannel.prefetch).toHaveBeenCalledWith(7);
  });

  it('publishes json payload with default metadata and merged options', async () => {
    await service.onModuleInit();

    const result = await service.publish(
      ORDERS_PROCESS_ROUTING_KEY,
      { orderId: 'order-1' },
      { attempt: 1 },
      { expiration: '5000' },
    );

    expect(result).toBe(true);
    expect(mockChannel.publish).toHaveBeenCalledWith(
      ORDERS_EXCHANGE,
      ORDERS_PROCESS_ROUTING_KEY,
      Buffer.from(JSON.stringify({ orderId: 'order-1' })),
      {
        persistent: true,
        contentType: 'application/json',
        headers: { attempt: 1 },
        expiration: '5000',
      },
    );
  });

  it('closes channel and connection on destroy after init', async () => {
    await service.onModuleInit();

    await service.onModuleDestroy();

    expect(mockChannel.close).toHaveBeenCalled();
    expect(mockConnection.close).toHaveBeenCalled();
  });

  it('does not fail on destroy when init was never called', async () => {
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    expect(mockChannel.close).not.toHaveBeenCalled();
    expect(mockConnection.close).not.toHaveBeenCalled();
  });
});
