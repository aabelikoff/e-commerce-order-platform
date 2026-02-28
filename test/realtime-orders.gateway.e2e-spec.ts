import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { OrdersEventsService } from '../src/orders/orders-events.service';
import { OrderStatusChangedEvent } from '../src/orders/orders-events.types';
import { OrdersService } from '../src/orders/orders.service';
import { OrdersGateway } from '../src/realtime/orders.gateway';

class MockOrdersEventsService {
  readonly events$ = new Subject<OrderStatusChangedEvent>();

  emit(event: OrderStatusChangedEvent): void {
    this.events$.next(event);
  }

  complete(): void {
    this.events$.complete();
  }
}

describe('OrdersGateway (e2e)', () => {
  let app: INestApplication;
  let baseUrl: string;

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  const mockOrdersService = {
    canSubscribeToOrder: jest.fn(),
  };

  const mockOrdersEvents = new MockOrdersEventsService();

  const waitForSocketConnect = (socket: Socket): Promise<void> =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('socket connect timeout')), 3000);
      socket.once('connect', () => {
        clearTimeout(timer);
        resolve();
      });
      socket.once('connect_error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

  const connectSocket = (token?: string): Socket =>
    io(`${baseUrl}/realtime`, {
      transports: ['websocket'],
      reconnection: false,
      auth: token ? { token } : undefined,
      forceNew: true,
    });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersGateway,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
        {
          provide: OrdersEventsService,
          useValue: mockOrdersEvents,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(0);

    const addr = app.getHttpServer().address();
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockJwtService.verifyAsync.mockImplementation(async (token: string) => {
      if (token !== 'valid-token') {
        throw new Error('invalid token');
      }
      return {
        sub: 'user-1',
        email: 'alice@example.com',
        roles: ['user'],
        scopes: ['order:read'],
      };
    });
    mockOrdersService.canSubscribeToOrder.mockResolvedValue(undefined);
  });

  afterAll(async () => {
    mockOrdersEvents.complete();
    await app.close();
  });

  it('disconnects unauthenticated client', async () => {
    const socket = connectSocket();

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('expected disconnect for unauthenticated client')),
        3000,
      );

      socket.on('disconnect', (reason) => {
        clearTimeout(timer);
        expect(reason).toBe('io server disconnect');
        resolve();
      });

      socket.on('connect_error', () => {
        clearTimeout(timer);
        resolve();
      });
    });

    socket.close();
  });

  it('subscribes client to order room', async () => {
    const socket = connectSocket('valid-token');
    await waitForSocketConnect(socket);

    const ack = await new Promise<{ ok: true }>((resolve) => {
      socket.emit('subscribeOrder', { orderId: 'order-1' }, resolve);
    });

    expect(ack).toEqual({ ok: true });
    expect(mockOrdersService.canSubscribeToOrder).toHaveBeenCalledWith(
      'order-1',
      expect.objectContaining({ sub: 'user-1' }),
    );

    socket.close();
  });

  it('emits exception when subscription is denied', async () => {
    mockOrdersService.canSubscribeToOrder.mockRejectedValueOnce(new Error('Subscription denied'));
    const socket = connectSocket('valid-token');
    await waitForSocketConnect(socket);

    const exception = await new Promise<{ message: string | string[] }>((resolve) => {
      socket.once('exception', resolve);
      socket.emit('subscribeOrder', { orderId: 'order-denied' });
    });

    expect(String(exception.message)).toContain('Subscription denied');
    socket.close();
  });

  it('broadcasts order.status only to subscribed clients', async () => {
    const socketOrder1 = connectSocket('valid-token');
    const socketOrder2 = connectSocket('valid-token');

    await Promise.all([waitForSocketConnect(socketOrder1), waitForSocketConnect(socketOrder2)]);

    await Promise.all([
      new Promise((resolve) => socketOrder1.emit('subscribeOrder', { orderId: 'order-1' }, resolve)),
      new Promise((resolve) => socketOrder2.emit('subscribeOrder', { orderId: 'order-2' }, resolve)),
    ]);

    const eventPromise = new Promise<OrderStatusChangedEvent>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('did not receive order.status')), 3000);
      socketOrder1.once('order.status', (payload: OrderStatusChangedEvent) => {
        clearTimeout(timer);
        resolve(payload);
      });
    });

    const nonTargetPromise = new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), 500);
      socketOrder2.once('order.status', () => {
        clearTimeout(timer);
        resolve(true);
      });
    });

    mockOrdersEvents.emit({
      type: 'order.status_changed',
      orderId: 'order-1',
      version: 1,
      fromStatus: 'pending' as any,
      toStatus: 'paid' as any,
      changedAt: new Date().toISOString(),
    });

    const [event, receivedByWrongSocket] = await Promise.all([eventPromise, nonTargetPromise]);

    expect(event.orderId).toBe('order-1');
    expect(receivedByWrongSocket).toBe(false);

    socketOrder1.close();
    socketOrder2.close();
  });
});

