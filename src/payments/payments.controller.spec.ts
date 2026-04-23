import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ERoles } from 'src/auth/access/roles';
import { AuthUser } from 'src/auth/types';
import { Order, EPaymentStatus } from 'src/database/entities';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CanPayGuard } from './guards/can-pay.guard';

describe('PaymentsController', () => {
  let controller: PaymentsController;

  const mockPaymentsService = {
    payOrder: jest.fn(),
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
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
        {
          provide: CanPayGuard,
          useValue: {},
        },
        {
          provide: JwtAuthGuard,
          useValue: {},
        },
        {
          provide: getRepositoryToken(Order),
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates pay to PaymentsService with audit request context', async () => {
    const req = {
      user,
      requestId: 'req-1',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'jest',
      },
    };

    mockPaymentsService.payOrder.mockResolvedValue({
      id: 'payment-1',
      status: EPaymentStatus.PAID,
    });

    const result = await controller.pay('order-1', req as any);

    expect(mockPaymentsService.payOrder).toHaveBeenCalledWith('order-1', user, {
      requestId: 'req-1',
      ip: '127.0.0.1',
      userAgent: 'jest',
    });
    expect(result).toEqual({
      id: 'payment-1',
      status: EPaymentStatus.PAID,
    });
  });
});
