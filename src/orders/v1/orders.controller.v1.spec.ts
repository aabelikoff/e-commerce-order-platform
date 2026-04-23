import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { ERoles } from 'src/auth/access/roles';
import { AuthUser } from 'src/auth/types';
import { CursorPaginationQueryDto } from 'src/common/dto/cursor-pagination-query.dto';
import { EOrderStatus } from 'src/database/entities';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersV1Controller } from './orders.controller.v1';
import { OrdersService } from '../orders.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

describe('OrdersController', () => {
  let controller: OrdersV1Controller;

  type AuthenticatedRequest = Request & {
    user: AuthUser;
    requestId?: string;
  };

  const mockOrdersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    updateStatus: jest.fn(),
    delete: jest.fn(),
  };

  const user: AuthUser = {
    sub: 'user-1',
    email: 'alice@example.com',
    roles: [ERoles.USER],
    scopes: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersV1Controller],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    }).compile();

    controller = module.get<OrdersV1Controller>(OrdersV1Controller);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates create to OrdersService', async () => {
    const dto: CreateOrderDto = {
      userId: 'user-1',
      items: [{ productId: 'product-1', quantity: 2 }],
    };

    mockOrdersService.create.mockResolvedValue({
      created: true,
      order: { id: 'order-1' },
    });

    const result = await controller.create(dto, 'idem-1');

    expect(mockOrdersService.create).toHaveBeenCalledWith(dto, 'idem-1');
    expect(result).toEqual({
      created: true,
      order: { id: 'order-1' },
    });
  });

  it('delegates getAll using req.user and query', async () => {
    const query: CursorPaginationQueryDto = { limit: 10 };

    mockOrdersService.findAll.mockResolvedValue({
      items: [],
      pagination: { hasNext: false, nextCursor: null },
    });

    const req: AuthenticatedRequest = { user } as AuthenticatedRequest;
    const result = await controller.getAll(req, query);

    expect(mockOrdersService.findAll).toHaveBeenCalledWith(user, query);
    expect(result).toEqual({
      items: [],
      pagination: { hasNext: false, nextCursor: null },
    });
  });

  it('delegates getOne using req.user and id', async () => {
    mockOrdersService.findOne.mockResolvedValue({ id: 'order-1' });

    const req: AuthenticatedRequest = { user } as AuthenticatedRequest;
    const result = await controller.getOne(req, 'order-1');

    expect(mockOrdersService.findOne).toHaveBeenCalledWith(user, 'order-1');
    expect(result).toEqual({ id: 'order-1' });
  });

  it('delegates updateStatus with audit request context', async () => {
    const req: AuthenticatedRequest = {
      user: {
        sub: 'admin-1',
        email: 'admin@example.com',
        roles: [ERoles.ADMIN],
        scopes: [],
      },
      requestId: 'req-1',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'jest',
      },
    } as AuthenticatedRequest;
    const dto: UpdateOrderStatusDto = {
      status: EOrderStatus.PAID,
    };

    mockOrdersService.updateStatus.mockResolvedValue({
      id: 'order-1',
      status: EOrderStatus.PAID,
    });

    const result = await controller.updateStatus('order-1', dto, req);

    expect(mockOrdersService.updateStatus).toHaveBeenCalledWith(
      'order-1',
      EOrderStatus.PAID,
      req.user,
      {
        requestId: 'req-1',
        ip: '127.0.0.1',
        userAgent: 'jest',
      },
    );
    expect(result).toEqual({
      id: 'order-1',
      status: EOrderStatus.PAID,
    });
  });

  it('delegates delete to OrdersService', async () => {
    mockOrdersService.delete.mockResolvedValue(undefined);

    await expect(controller.delete('order-1')).resolves.toBeUndefined();

    expect(mockOrdersService.delete).toHaveBeenCalledWith('order-1');
  });
});
