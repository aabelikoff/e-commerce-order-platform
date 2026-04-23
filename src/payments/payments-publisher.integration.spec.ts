import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { ClientGrpc } from '@nestjs/microservices';
import { of } from 'rxjs';
import { ERoles } from 'src/auth/access/roles';
import { AuthUser } from 'src/auth/types';
import { AuditAction, AuditService } from 'src/common/audit';
import { PAYMENTS_GRPC_CLIENT } from 'src/common/grpc/grpc.constants';
import { EPaymentStatus, Order, Payment } from 'src/database/entities';
import { KafkaService } from 'src/kafka/kafka.service';
import { PaymentsEventsPublisher } from './payments-events.publisher';
import { PaymentsService } from './payments.service';

describe('PaymentsService + PaymentsEventsPublisher integration', () => {
  let service: PaymentsService;

  const user: AuthUser = {
    sub: 'user-1',
    email: 'alice@example.com',
    roles: [ERoles.USER],
    scopes: [],
  };

  const request = {
    requestId: 'req-1',
    ip: '127.0.0.1',
    userAgent: 'jest',
  };

  const baseOrder = (): Order =>
    ({
      id: 'order-1',
      userId: 'user-1',
      totalAmount: '10.00',
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
    }) as unknown as Order;

  const basePayment = (overrides: Partial<Payment> = {}): Payment =>
    ({
      id: 'payment-1',
      orderId: 'order-1',
      status: EPaymentStatus.PENDING,
      paidAt: null,
      paidAmount: '0.00',
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      ...overrides,
    }) as unknown as Payment;

  const mockOrdersQueryBuilder = {
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  const mockPaymentsRepository = {
    findOne: jest.fn(),
  };

  const mockOrdersRepository = {
    createQueryBuilder: jest.fn(() => mockOrdersQueryBuilder),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'paymentsServiceConfig.paymentsGrpcTimeoutMs') {
        return 2500;
      }
      if (key === 'kafka.topicPaymentsEvents') {
        return 'payments.events';
      }
      return undefined;
    }),
  };

  const mockAuditService = {
    recordWithRequest: jest.fn(),
  };

  const mockKafkaService = {
    isEnabled: jest.fn(() => true),
    publish: jest.fn(),
  };

  const paymentsClientMock = {
    authorize: jest.fn(),
    capture: jest.fn(),
  };

  const mockGrpcClient = {
    getService: jest.fn(() => paymentsClientMock),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockKafkaService.isEnabled.mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        PaymentsEventsPublisher,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentsRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrdersRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: KafkaService,
          useValue: mockKafkaService,
        },
        {
          provide: PAYMENTS_GRPC_CLIENT,
          useValue: mockGrpcClient,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    service.onModuleInit();
  });

  it('captures payment and publishes a PaymentCaptured kafka envelope via real publisher', async () => {
    const order = baseOrder();
    const authorizedPayment = basePayment({
      status: EPaymentStatus.PENDING,
    });
    const paidPayment = basePayment({
      status: EPaymentStatus.PAID,
      updatedAt: new Date('2026-01-01T00:05:00.000Z'),
    });

    mockOrdersQueryBuilder.getOne.mockResolvedValue(order);
    mockPaymentsRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(authorizedPayment)
      .mockResolvedValueOnce(paidPayment);
    paymentsClientMock.authorize.mockReturnValue(
      of({
        paymentId: 'payment-1',
        status: 1,
        message: 'authorized',
      }),
    );
    paymentsClientMock.capture.mockReturnValue(
      of({
        ok: true,
        message: 'captured',
      }),
    );
    mockKafkaService.publish.mockResolvedValue(undefined);

    const result = await service.payOrder(order.id, user, request);

    expect(paymentsClientMock.authorize).toHaveBeenCalledWith({
      orderId: 'order-1',
      userId: 'user-1',
      total: {
        amount: '10.00',
        currency: 'USD',
      },
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(paymentsClientMock.capture).toHaveBeenCalledWith({
      paymentId: 'payment-1',
    });
    expect(mockKafkaService.publish).toHaveBeenCalledWith(
      'payments.events',
      'order-1',
      expect.objectContaining({
        eventName: 'PaymentCaptured',
        schemaVersion: 2,
        eventId: expect.any(String),
        occurredAt: expect.any(String),
        payment: {
          paymentId: 'payment-1',
          orderId: 'order-1',
          amount: '10.00',
          currency: 'USD',
          provider: 'mock',
          status: 'CAPTURED',
          providerTransactionId: undefined,
        },
      }),
    );
    expect(mockAuditService.recordWithRequest).toHaveBeenCalledWith(
      {
        action: AuditAction.PaymentCaptureRequested,
        actor: {
          id: user.sub,
          roles: user.roles,
          scopes: user.scopes,
        },
        targetType: 'payment',
        targetId: 'payment-1',
        outcome: 'success',
        details: {
          orderId: 'order-1',
          paymentStatus: EPaymentStatus.PAID,
        },
      },
      request,
    );
    expect(result).toBe(paidPayment);
  });

  it('skips kafka publish when kafka is disabled but still returns captured payment', async () => {
    const order = baseOrder();
    const payment = basePayment({
      status: EPaymentStatus.PENDING,
    });
    const paidPayment = basePayment({
      status: EPaymentStatus.PAID,
    });

    mockKafkaService.isEnabled.mockReturnValue(false);
    mockOrdersQueryBuilder.getOne.mockResolvedValue(order);
    mockPaymentsRepository.findOne
      .mockResolvedValueOnce(payment)
      .mockResolvedValueOnce(paidPayment);
    paymentsClientMock.capture.mockReturnValue(
      of({
        ok: true,
        message: 'captured',
      }),
    );

    const result = await service.payOrder(order.id, user);

    expect(paymentsClientMock.authorize).not.toHaveBeenCalled();
    expect(paymentsClientMock.capture).toHaveBeenCalledWith({
      paymentId: 'payment-1',
    });
    expect(mockKafkaService.publish).not.toHaveBeenCalled();
    expect(result).toBe(paidPayment);
  });
});
