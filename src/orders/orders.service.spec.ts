import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, DeleteResult } from 'typeorm';
import { ERoles } from 'src/auth/access/roles';
import { AuthUser } from 'src/auth/types';
import { AuditAction, AuditService } from 'src/common/audit';
import { Order, EOrderStatus } from 'src/database/entities';
import { MetricsService } from 'src/metrics/metrics.service';
import { OutboxService } from 'src/outbox/outbox.service';
import { OrdersEventsService } from './orders-events.service';
import { OrdersService } from './orders.service';
import { paginateQueryBuilderByCursor } from 'src/common/pagination/cursor/paginate-query-builder';

jest.mock('src/common/pagination/cursor/paginate-query-builder', () => ({
  paginateQueryBuilderByCursor: jest.fn(),
}));

describe('OrdersService', () => {
  let service: OrdersService;

  const paginateMock = paginateQueryBuilderByCursor as jest.MockedFunction<
    typeof paginateQueryBuilderByCursor
  >;

  const customerUser: AuthUser = {
    sub: 'user-1',
    email: 'alice@example.com',
    roles: [ERoles.USER],
    scopes: [],
  };

  const adminUser: AuthUser = {
    sub: 'admin-1',
    email: 'admin@example.com',
    roles: [ERoles.ADMIN],
    scopes: [],
  };

  const baseOrder = (): Order =>
    ({
      id: 'order-1',
      userId: 'user-1',
      status: EOrderStatus.PENDING,
      statusVersion: 1,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      itemsSubtotal: '10.00',
      itemsDiscountTotal: '0.00',
      shippingAmount: '0.00',
      orderDiscountAmount: '0.00',
      totalAmount: '10.00',
      paidAmount: '0.00',
      paidAt: null,
      idempotencyKey: 'idem-1',
      processedAt: null,
      items: [],
      payments: [],
    }) as unknown as Order;

  const mockQueryBuilder = {
    leftJoin: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  const mockOrdersRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    release: jest.fn(),
    isTransactionActive: true,
    manager: {},
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
  };

  const mockOrdersEventsService = {
    publishStatusChanged: jest.fn(),
  };

  const mockOutboxService = {
    add: jest.fn(),
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
    paginateMock.mockResolvedValue({
      items: [],
      pagination: {
        hasNext: false,
        nextCursor: null,
      },
    } as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrdersRepository,
        },
        {
          provide: OrdersEventsService,
          useValue: mockOrdersEventsService,
        },
        {
          provide: OutboxService,
          useValue: mockOutboxService,
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws when create dto has no items', async () => {
    await expect(
      service.create(
        {
          userId: 'user-1',
          items: [],
        },
        'idem-1',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled();
  });

  it('throws when create dto contains duplicate product ids', async () => {
    await expect(
      service.create(
        {
          userId: 'user-1',
          items: [
            { productId: 'product-1', quantity: 1 },
            { productId: 'product-1', quantity: 2 },
          ],
        },
        'idem-1',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled();
  });

  it('filters findAll by user id for non-staff users', async () => {
    const query = { limit: 10 };

    await service.findAll(customerUser, query as any);

    expect(mockOrdersRepository.createQueryBuilder).toHaveBeenCalledWith(
      'order',
    );
    expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
      'order.user',
      'user',
    );
    expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.id = :userId', {
      userId: customerUser.sub,
    });
    expect(paginateMock).toHaveBeenCalledWith(mockQueryBuilder, query, 'order');
  });

  it('does not add user filter in findAll for staff users', async () => {
    const query = { limit: 5 };

    await service.findAll(adminUser, query as any);

    expect(mockQueryBuilder.where).not.toHaveBeenCalled();
    expect(paginateMock).toHaveBeenCalledWith(mockQueryBuilder, query, 'order');
  });

  it('returns one order for owner and applies ownership filter', async () => {
    const order = baseOrder();
    mockQueryBuilder.getOne.mockResolvedValue(order);

    const result = await service.findOne(customerUser, order.id);

    expect(mockQueryBuilder.where).toHaveBeenCalledWith('order.id = :id', {
      id: order.id,
    });
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      'user.id = :userId',
      { userId: customerUser.sub },
    );
    expect(result).toBe(order);
  });

  it('throws NotFoundException when findOne cannot find order', async () => {
    mockQueryBuilder.getOne.mockResolvedValue(null);

    await expect(service.findOne(customerUser, 'missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('deletes order when repository reports affected rows', async () => {
    mockOrdersRepository.delete.mockResolvedValue({
      affected: 1,
    } as DeleteResult);

    await expect(service.delete('order-1')).resolves.toBeUndefined();

    expect(mockOrdersRepository.delete).toHaveBeenCalledWith('order-1');
  });

  it('throws NotFoundException when delete affects no rows', async () => {
    mockOrdersRepository.delete.mockResolvedValue({
      affected: 0,
    } as DeleteResult);

    await expect(service.delete('missing')).rejects.toThrow(NotFoundException);
  });

  it('forbids updateStatus for non-staff user', async () => {
    await expect(
      service.updateStatus('order-1', EOrderStatus.PAID, customerUser),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws NotFoundException when updateStatus cannot find order', async () => {
    mockOrdersRepository.findOne.mockResolvedValue(null);

    await expect(
      service.updateStatus('missing', EOrderStatus.PAID, adminUser),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns existing order when updateStatus receives same status', async () => {
    const order = baseOrder();
    mockOrdersRepository.findOne.mockResolvedValue(order);

    const result = await service.updateStatus(
      order.id,
      EOrderStatus.PENDING,
      adminUser,
    );

    expect(mockOrdersRepository.save).not.toHaveBeenCalled();
    expect(mockOrdersEventsService.publishStatusChanged).not.toHaveBeenCalled();
    expect(mockAuditService.recordWithRequest).not.toHaveBeenCalled();
    expect(result).toBe(order);
  });

  it('updates order status, publishes event and records audit event', async () => {
    const order = baseOrder();
    const updatedOrder = {
      ...order,
      status: EOrderStatus.PAID,
      statusVersion: 2,
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };
    const request = {
      requestId: 'req-1',
      ip: '127.0.0.1',
      userAgent: 'jest',
    };

    mockOrdersRepository.findOne.mockResolvedValue(order);
    mockOrdersRepository.save.mockImplementation(async (value: Order) => ({
      ...value,
      updatedAt: updatedOrder.updatedAt,
    }));

    const result = await service.updateStatus(
      order.id,
      EOrderStatus.PAID,
      adminUser,
      request,
    );

    expect(mockOrdersRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: order.id,
        status: EOrderStatus.PAID,
        statusVersion: 2,
      }),
    );
    expect(mockOrdersEventsService.publishStatusChanged).toHaveBeenCalledWith({
      type: 'order.status_changed',
      orderId: order.id,
      version: 2,
      fromStatus: EOrderStatus.PENDING,
      toStatus: EOrderStatus.PAID,
      changedAt: updatedOrder.updatedAt.toISOString(),
    });
    expect(mockAuditService.recordWithRequest).toHaveBeenCalledWith(
      {
        action: AuditAction.OrderStatusOverride,
        actor: {
          id: adminUser.sub,
          roles: adminUser.roles,
          scopes: adminUser.scopes,
        },
        targetType: 'order',
        targetId: order.id,
        outcome: 'success',
        reason: 'manual_status_change',
        details: {
          fromStatus: EOrderStatus.PENDING,
          toStatus: EOrderStatus.PAID,
          statusVersion: 2,
        },
      },
      request,
    );
    expect(result.status).toBe(EOrderStatus.PAID);
  });

  it('allows owner to subscribe to own order', async () => {
    mockOrdersRepository.findOne.mockResolvedValue(baseOrder());

    await expect(
      service.canSubscribeToOrder('order-1', customerUser),
    ).resolves.toBeUndefined();
  });

  it('allows staff to subscribe to any order', async () => {
    mockOrdersRepository.findOne.mockResolvedValue(baseOrder());

    await expect(
      service.canSubscribeToOrder('order-1', adminUser),
    ).resolves.toBeUndefined();
  });

  it('throws NotFoundException when canSubscribeToOrder cannot find order', async () => {
    mockOrdersRepository.findOne.mockResolvedValue(null);

    await expect(
      service.canSubscribeToOrder('missing', customerUser),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when non-owner subscribes to another users order', async () => {
    mockOrdersRepository.findOne.mockResolvedValue(baseOrder());

    await expect(
      service.canSubscribeToOrder('order-1', {
        ...customerUser,
        sub: 'user-2',
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
