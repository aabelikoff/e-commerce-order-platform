import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AuditService } from 'src/common/audit';
import {
  EOrderStatus,
  Order,
  OrderItem,
  OutboxEvent,
  Product,
  User,
} from 'src/database/entities';
import { MetricsService } from 'src/metrics/metrics.service';
import { OutboxService } from 'src/outbox/outbox.service';
import { OrdersEventsService } from './orders-events.service';
import { OrdersService } from './orders.service';

describe('OrdersService + OutboxService integration', () => {
  let service: OrdersService;

  const createdAt = new Date('2026-01-10T10:00:00.000Z');
  const savedOutboxEvents: Array<Record<string, unknown>> = [];

  const mockOutboxRepository = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    createQueryBuilder: jest.fn(),
    update: jest.fn(),
  };

  const mockManagerOutboxRepository = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value: Record<string, unknown>) => {
      const saved = {
        id: `outbox-${savedOutboxEvents.length + 1}`,
        createdAt,
        updatedAt: createdAt,
        lastError: null,
        sentAt: null,
        ...value,
      };
      savedOutboxEvents.push(saved);
      return saved;
    }),
  };

  const mockManager = {
    exists: jest.fn(),
    findOne: jest.fn(),
    query: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    getRepository: jest.fn((entity) => {
      if (entity === OutboxEvent) {
        return mockManagerOutboxRepository;
      }
      throw new Error(`Unexpected manager repository: ${String(entity)}`);
    }),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    release: jest.fn(),
    isTransactionActive: true,
    manager: mockManager,
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
  };

  const mockOrdersRepository = {
    findOne: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockOrdersEventsService = {
    publishStatusChanged: jest.fn(),
  };

  const mockMetricsService = {
    incrementOrdersCreated: jest.fn(),
    incrementOrdersFailed: jest.fn(),
  };

  const mockAuditService = {
    recordWithRequest: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    savedOutboxEvents.length = 0;
    mockQueryRunner.isTransactionActive = true;

    mockManager.exists.mockResolvedValue(true);
    mockManager.findOne.mockResolvedValue(null);
    mockManager.query.mockImplementation(async (sql: string, params: any[]) => {
      if (sql.includes('SELECT id, stock, price')) {
        return [
          {
            id: params[0][0],
            stock: '10',
            price: '15.00',
          },
        ];
      }

      if (sql.includes('UPDATE products')) {
        return [{ id: params[1] }];
      }

      return [];
    });
    mockManager.create.mockImplementation((entity: unknown, payload: any) => {
      if (entity === Order) {
        return {
          id: '6d413bd6-a6f0-4b57-9c10-4d3521e1a001',
          createdAt,
          updatedAt: createdAt,
          statusVersion: 0,
          paidAmount: '0.00',
          paidAt: null,
          processedAt: null,
          items: [],
          payments: [],
          ...payload,
        };
      }

      if (entity === OrderItem) {
        return {
          id: `item-${payload.product.id}`,
          ...payload,
        };
      }

      return payload;
    });
    mockManager.save.mockImplementation(
      async (entityOrTarget: unknown, maybeEntity?: unknown) => {
        if (entityOrTarget === OrderItem) {
          return maybeEntity;
        }
        return entityOrTarget;
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        OutboxService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrdersRepository,
        },
        {
          provide: getRepositoryToken(OutboxEvent),
          useValue: mockOutboxRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: OrdersEventsService,
          useValue: mockOrdersEventsService,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('creates order and persists both outbox events within the transaction', async () => {
    const result = await service.create(
      {
        userId: 'user-1',
        items: [
          {
            productId: 'product-1',
            quantity: 2,
          },
        ],
      },
      '550e8400-e29b-41d4-a716-446655440000',
    );

    expect(result.created).toBe(true);
    expect(result.order).toEqual(
      expect.objectContaining({
        id: '6d413bd6-a6f0-4b57-9c10-4d3521e1a001',
        userId: 'user-1',
        status: EOrderStatus.PENDING,
        totalAmount: '30.00',
      }),
    );
    expect(mockQueryRunner.connect).toHaveBeenCalled();
    expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
    expect(mockMetricsService.incrementOrdersCreated).toHaveBeenCalled();
    expect(mockMetricsService.incrementOrdersFailed).not.toHaveBeenCalled();
    expect(mockManager.getRepository).toHaveBeenCalledWith(OutboxEvent);
    expect(savedOutboxEvents).toHaveLength(2);
    expect(savedOutboxEvents[0]).toEqual(
      expect.objectContaining({
        aggregateType: 'order',
        aggregateId: '6d413bd6-a6f0-4b57-9c10-4d3521e1a001',
        eventType: 'order.process_requested',
        status: 'pending',
        attempts: 0,
        payload: expect.objectContaining({
          orderId: '6d413bd6-a6f0-4b57-9c10-4d3521e1a001',
          attempt: 1,
          createdAt: createdAt.toISOString(),
          messageId: expect.any(String),
        }),
      }),
    );
    expect(savedOutboxEvents[1]).toEqual(
      expect.objectContaining({
        aggregateType: 'order',
        aggregateId: '6d413bd6-a6f0-4b57-9c10-4d3521e1a001',
        eventType: 'order.placed',
        status: 'pending',
        attempts: 0,
        payload: expect.objectContaining({
          eventId: expect.any(String),
          eventName: 'OrderPlaced',
          occurredAt: createdAt.toISOString(),
          schemaVersion: 1,
          order: {
            orderId: '6d413bd6-a6f0-4b57-9c10-4d3521e1a001',
            userId: 'user-1',
            totalAmount: '30.00',
            currency: 'USD',
          },
        }),
      }),
    );
  });

  it('returns existing order for repeated idempotency key without creating new outbox events', async () => {
    const existingOrder = {
      id: 'existing-order-1',
      userId: 'user-1',
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
      status: EOrderStatus.PENDING,
      items: [],
    } as unknown as Order;

    mockManager.findOne.mockResolvedValue(existingOrder);

    const result = await service.create(
      {
        userId: 'user-1',
        items: [
          {
            productId: 'product-1',
            quantity: 1,
          },
        ],
      },
      '550e8400-e29b-41d4-a716-446655440000',
    );

    expect(result).toEqual({
      order: existingOrder,
      created: false,
    });
    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    expect(savedOutboxEvents).toHaveLength(0);
    expect(mockMetricsService.incrementOrdersCreated).not.toHaveBeenCalled();
  });
});
