import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { ERoles } from '../src/auth/access/roles';
import { EOrderScopes } from '../src/auth/access/scopes';
import { AccessGuard } from '../src/auth/guards/access.guard';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { EOrderStatus } from '../src/database/entities';
import { OrdersService } from '../src/orders/orders.service';
import { OrderResponseInterceptor } from '../src/orders/v1/interceptors/order-response-status.interceptor';
import { OrdersV1Controller } from '../src/orders/v1/orders.controller.v1';

class TestJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const authHeader = String(req.headers.authorization ?? '');
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (token === 'user-token') {
      req.user = {
        sub: 'user-1',
        email: 'alice@example.com',
        roles: [ERoles.USER],
        scopes: [EOrderScopes.ORDER_READ, EOrderScopes.ORDER_WRITE],
      };
      return true;
    }

    if (token === 'admin-token') {
      req.user = {
        sub: 'admin-1',
        email: 'admin@example.com',
        roles: [ERoles.ADMIN],
        scopes: [EOrderScopes.ORDER_READ, EOrderScopes.ORDER_WRITE],
      };
      return true;
    }

    throw new UnauthorizedException('Unauthorized');
  }
}

describe('OrdersController (e2e)', () => {
  let app: INestApplication;

  const mockOrdersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    updateStatus: jest.fn(),
    delete: jest.fn(),
  };

  const getHttpServer = (): Parameters<typeof request>[0] =>
    app.getHttpServer() as Parameters<typeof request>[0];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [OrdersV1Controller],
      providers: [
        AccessGuard,
        OrderResponseInterceptor,
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestJwtAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockOrdersService.create.mockResolvedValue({
      created: true,
      order: {
        id: '6d413bd6-a6f0-4b57-9c10-4d3521e1a001',
        status: EOrderStatus.PENDING,
      },
    });
    mockOrdersService.findAll.mockResolvedValue({
      items: [{ id: 'order-1' }],
      pagination: {
        hasNext: false,
        nextCursor: null,
      },
    });
    mockOrdersService.findOne.mockResolvedValue({
      id: '6d413bd6-a6f0-4b57-9c10-4d3521e1a001',
    });
    mockOrdersService.updateStatus.mockResolvedValue({
      id: '6d413bd6-a6f0-4b57-9c10-4d3521e1a001',
      status: EOrderStatus.PAID,
    });
    mockOrdersService.delete.mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns unauthorized for protected orders route without token', async () => {
    await request(getHttpServer()).get('/api/v1/orders').expect(401);
  });

  it('lists orders for authenticated user and passes query to service', async () => {
    const response = await request(getHttpServer())
      .get('/api/v1/orders?limit=5&cursor=cursor-1')
      .set('Authorization', 'Bearer user-token')
      .expect(200);

    expect(mockOrdersService.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 'user-1',
      }),
      expect.objectContaining({
        limit: 5,
        cursor: 'cursor-1',
      }),
    );
    expect(response.body.data).toEqual({
      items: [{ id: 'order-1' }],
      pagination: {
        hasNext: false,
        nextCursor: null,
      },
    });
  });

  it('creates an order when auth, scope and idempotency header are valid', async () => {
    const response = await request(getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', 'Bearer user-token')
      .set('Idempotency-Key', '550e8400-e29b-41d4-a716-446655440000')
      .send({
        userId: '6d413bd6-a6f0-4b57-9c10-4d3521e1a001',
        items: [
          {
            productId: 'e4b7984b-070c-4a9a-975b-2f35705f2cc0',
            quantity: 2,
          },
        ],
      })
      .expect(201);

    expect(mockOrdersService.create).toHaveBeenCalledWith(
      {
        userId: '6d413bd6-a6f0-4b57-9c10-4d3521e1a001',
        items: [
          {
            productId: 'e4b7984b-070c-4a9a-975b-2f35705f2cc0',
            quantity: 2,
          },
        ],
      },
      '550e8400-e29b-41d4-a716-446655440000',
    );
    expect(response.body.data).toEqual({
      id: '6d413bd6-a6f0-4b57-9c10-4d3521e1a001',
      status: EOrderStatus.PENDING,
    });
  });

  it('returns bad request when idempotency key is missing', async () => {
    const response = await request(getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', 'Bearer user-token')
      .send({
        userId: '6d413bd6-a6f0-4b57-9c10-4d3521e1a001',
        items: [
          {
            productId: 'e4b7984b-070c-4a9a-975b-2f35705f2cc0',
            quantity: 2,
          },
        ],
      })
      .expect(400);

    expect(response.body).toEqual(
      expect.objectContaining({
        status: 400,
        detail: 'Missing Idempotency-Key header',
      }),
    );
  });

  it('forbids status update for non-admin user', async () => {
    const response = await request(getHttpServer())
      .patch('/api/v1/orders/6d413bd6-a6f0-4b57-9c10-4d3521e1a001/status')
      .set('Authorization', 'Bearer user-token')
      .send({
        status: EOrderStatus.PAID,
      })
      .expect(403);

    expect(response.body).toEqual(
      expect.objectContaining({
        status: 403,
        detail: 'Access denied: insufficient role',
      }),
    );
  });

  it('updates status for admin and forwards audit request context', async () => {
    const response = await request(getHttpServer())
      .patch('/api/v1/orders/6d413bd6-a6f0-4b57-9c10-4d3521e1a001/status')
      .set('Authorization', 'Bearer admin-token')
      .set('User-Agent', 'jest-e2e')
      .send({
        status: EOrderStatus.PAID,
      })
      .expect(200);

    expect(mockOrdersService.updateStatus).toHaveBeenCalledWith(
      '6d413bd6-a6f0-4b57-9c10-4d3521e1a001',
      EOrderStatus.PAID,
      expect.objectContaining({
        sub: 'admin-1',
      }),
      {
        requestId: undefined,
        ip: expect.any(String),
        userAgent: 'jest-e2e',
      },
    );
    expect(response.body.data).toEqual({
      id: '6d413bd6-a6f0-4b57-9c10-4d3521e1a001',
      status: EOrderStatus.PAID,
    });
  });
});
