import {
  GatewayTimeoutException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError, TimeoutError } from 'rxjs';
import { ERoles } from 'src/auth/access/roles';
import { AuthUser } from 'src/auth/types';
import { AuditAction, AuditService } from 'src/common/audit';
import { PAYMENTS_GRPC_CLIENT } from 'src/common/grpc/grpc.constants';
import { EPaymentStatus, Order, Payment } from 'src/database/entities';
import { PaymentsEventsPublisher } from './payments-events.publisher';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const user: AuthUser = {
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
      totalAmount: '10.00',
      idempotencyKey: 'idem-1',
    }) as unknown as Order;

  const basePayment = (overrides: Partial<Payment> = {}): Payment =>
    ({
      id: 'payment-1',
      orderId: 'order-1',
      status: EPaymentStatus.PENDING,
      paidAt: null,
      paidAmount: '0.00',
      idempotencyKey: 'idem-1',
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

  const mockPaymentsEventsPublisher = {
    publishCaptured: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockAuditService = {
    recordWithRequest: jest.fn(),
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

    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'paymentsServiceConfig.paymentsGrpcTimeoutMs') return 2500;
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentsRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrdersRepository,
        },
        {
          provide: PaymentsEventsPublisher,
          useValue: mockPaymentsEventsPublisher,
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
          provide: PAYMENTS_GRPC_CLIENT,
          useValue: mockGrpcClient,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws NotFoundException when order is not accessible', async () => {
    mockOrdersQueryBuilder.getOne.mockResolvedValue(null);

    await expect(service.payOrder('missing-order', user)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('applies ownership filter for non-staff users', async () => {
    const order = baseOrder();
    const payment = basePayment({
      status: EPaymentStatus.PAID,
    });
    mockOrdersQueryBuilder.getOne.mockResolvedValue(order);
    mockPaymentsRepository.findOne.mockResolvedValue(payment);

    const result = await service.payOrder(order.id, user);

    expect(mockOrdersRepository.createQueryBuilder).toHaveBeenCalledWith(
      'order',
    );
    expect(mockOrdersQueryBuilder.andWhere).toHaveBeenCalledWith(
      'user.id = :userId',
      { userId: user.sub },
    );
    expect(result).toBe(payment);
  });

  it('does not apply ownership filter for staff users', async () => {
    const order = baseOrder();
    const payment = basePayment({
      status: EPaymentStatus.PAID,
    });
    mockOrdersQueryBuilder.getOne.mockResolvedValue(order);
    mockPaymentsRepository.findOne.mockResolvedValue(payment);

    await service.payOrder(order.id, adminUser);

    expect(mockOrdersQueryBuilder.andWhere).not.toHaveBeenCalled();
  });

  it('returns existing paid payment without capture', async () => {
    const order = baseOrder();
    const payment = basePayment({
      status: EPaymentStatus.PAID,
    });

    mockOrdersQueryBuilder.getOne.mockResolvedValue(order);
    mockPaymentsRepository.findOne.mockResolvedValue(payment);

    const result = await service.payOrder(order.id, user);

    expect(paymentsClientMock.authorize).not.toHaveBeenCalled();
    expect(paymentsClientMock.capture).not.toHaveBeenCalled();
    expect(result).toBe(payment);
  });

  it('authorizes, captures, publishes event and records audit on happy path', async () => {
    const order = baseOrder();
    const authorizedPayment = basePayment({
      id: 'payment-1',
      status: EPaymentStatus.PENDING,
    });
    const paidPayment = basePayment({
      id: 'payment-1',
      status: EPaymentStatus.PAID,
    });
    const request = {
      requestId: 'req-1',
      ip: '127.0.0.1',
      userAgent: 'jest',
    };

    mockOrdersQueryBuilder.getOne.mockResolvedValue(order);
    mockPaymentsRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(authorizedPayment)
      .mockResolvedValueOnce(paidPayment);
    paymentsClientMock.authorize.mockReturnValue(
      of({
        paymentId: 'payment-1',
      }),
    );
    paymentsClientMock.capture.mockReturnValue(
      of({
        ok: true,
      }),
    );

    const result = await service.payOrder(order.id, user, request);

    expect(paymentsClientMock.authorize).toHaveBeenCalledWith({
      orderId: order.id,
      userId: order.userId,
      total: {
        amount: order.totalAmount,
        currency: 'USD',
      },
      idempotencyKey: order.idempotencyKey,
    });
    expect(paymentsClientMock.capture).toHaveBeenCalledWith({
      paymentId: 'payment-1',
    });
    expect(mockPaymentsEventsPublisher.publishCaptured).toHaveBeenCalledWith({
      paymentId: 'payment-1',
      orderId: order.id,
      amount: order.totalAmount,
      currency: 'USD',
      provider: 'mock',
    });
    expect(mockAuditService.recordWithRequest).toHaveBeenCalledWith(
      {
        action: AuditAction.PaymentCaptureRequested,
        actor: {
          id: user.sub,
          roles: user.roles,
          scopes: user.scopes,
        },
        targetType: 'payment',
        targetId: paidPayment.id,
        outcome: 'success',
        details: {
          orderId: order.id,
          paymentStatus: paidPayment.status,
        },
      },
      request,
    );
    expect(result).toBe(paidPayment);
  });

  it('throws NotFoundException when payment is missing after authorization', async () => {
    const order = baseOrder();

    mockOrdersQueryBuilder.getOne.mockResolvedValue(order);
    mockPaymentsRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    paymentsClientMock.authorize.mockReturnValue(
      of({
        paymentId: 'payment-404',
      }),
    );

    await expect(service.payOrder(order.id, user)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws GatewayTimeoutException and records failure audit on timeout', async () => {
    const order = baseOrder();
    const payment = basePayment();
    const request = {
      requestId: 'req-2',
      ip: '127.0.0.1',
      userAgent: 'jest',
    };

    mockOrdersQueryBuilder.getOne.mockResolvedValue(order);
    mockPaymentsRepository.findOne.mockResolvedValue(payment);
    paymentsClientMock.capture.mockReturnValue(
      throwError(() => new TimeoutError()),
    );

    await expect(service.payOrder(order.id, user, request)).rejects.toThrow(
      GatewayTimeoutException,
    );

    expect(mockAuditService.recordWithRequest).toHaveBeenCalledWith(
      {
        action: AuditAction.PaymentCaptureRequested,
        actor: {
          id: user.sub,
          roles: user.roles,
          scopes: user.scopes,
        },
        targetType: 'order',
        targetId: order.id,
        outcome: 'failure',
        reason: 'Timeout has occurred',
      },
      request,
    );
  });

  it('throws ServiceUnavailableException on grpc transport error', async () => {
    const order = baseOrder();
    const payment = basePayment();

    mockOrdersQueryBuilder.getOne.mockResolvedValue(order);
    mockPaymentsRepository.findOne.mockResolvedValue(payment);
    paymentsClientMock.capture.mockReturnValue(
      throwError(() => ({ code: 14 })),
    );

    await expect(service.payOrder(order.id, user)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('throws ServiceUnavailableException when capture response is not ok', async () => {
    const order = baseOrder();
    const payment = basePayment();

    mockOrdersQueryBuilder.getOne.mockResolvedValue(order);
    mockPaymentsRepository.findOne.mockResolvedValue(payment);
    paymentsClientMock.capture.mockReturnValue(
      of({
        ok: false,
        message: 'capture failed',
      }),
    );

    await expect(service.payOrder(order.id, user)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('does not fail payment flow when publishCaptured throws', async () => {
    const order = baseOrder();
    const payment = basePayment({
      status: EPaymentStatus.PENDING,
    });
    const paidPayment = basePayment({
      status: EPaymentStatus.PAID,
    });

    mockOrdersQueryBuilder.getOne.mockResolvedValue(order);
    mockPaymentsRepository.findOne
      .mockResolvedValueOnce(payment)
      .mockResolvedValueOnce(paidPayment);
    paymentsClientMock.capture.mockReturnValue(
      of({
        ok: true,
      }),
    );
    mockPaymentsEventsPublisher.publishCaptured.mockRejectedValue(
      new Error('kafka down'),
    );

    await expect(service.payOrder(order.id, user)).resolves.toBe(paidPayment);
  });
});
