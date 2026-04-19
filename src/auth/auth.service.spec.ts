import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from 'src/database/entities';
import { AuditAction, AuditService } from 'src/common/audit';
import { ERoles } from './access/roles';
import { EOrderScopes, EPaymentScopes } from './access/scopes';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  const compareMock = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;

  const mockQueryBuilder = {
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  const mockUserRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockAuditService = {
    recordWithRequest: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns access token for valid credentials', async () => {
    mockQueryBuilder.getOne.mockResolvedValue({
      id: 'user-1',
      email: 'alice@example.com',
      passwordHash: 'hashed-password',
      roles: [ERoles.USER],
      scopes: [
        EOrderScopes.ORDER_READ,
        EPaymentScopes.PAYMENT_WRITE,
        'unknown:scope',
      ],
    });

    compareMock.mockResolvedValue(true as never);
    mockJwtService.sign.mockReturnValue('jwt-token');

    const result = await service.login({
      email: 'alice@example.com',
      password: 'plain-password',
    });

    expect(mockUserRepository.createQueryBuilder).toHaveBeenCalledWith('user');
    expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
      'user.passwordHash',
    );
    expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.email = :email', {
      email: 'alice@example.com',
    });
    expect(compareMock).toHaveBeenCalledWith(
      'plain-password',
      'hashed-password',
    );
    expect(mockJwtService.sign).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'alice@example.com',
      roles: [ERoles.USER],
      scopes: [EOrderScopes.ORDER_READ, EPaymentScopes.PAYMENT_WRITE],
    });
    expect(result).toEqual({ accessToken: 'jwt-token' });
    expect(mockAuditService.recordWithRequest).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException and records audit event when user is not found', async () => {
    const request = {
      requestId: 'req-1',
      ip: '127.0.0.1',
      userAgent: 'jest',
    };

    mockQueryBuilder.getOne.mockResolvedValue(null);

    await expect(
      service.login(
        {
          email: 'missing@example.com',
          password: 'plain-password',
        },
        request,
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(compareMock).not.toHaveBeenCalled();
    expect(mockJwtService.sign).not.toHaveBeenCalled();
    expect(mockAuditService.recordWithRequest).toHaveBeenCalledWith(
      {
        action: AuditAction.AuthLoginFailed,
        actor: {
          id: 'anonymous',
          roles: ['anonymous'],
        },
        targetType: 'auth_identity',
        targetId: 'unknown',
        outcome: 'failure',
        reason: 'invalid_credentials',
      },
      request,
    );
  });

  it('throws UnauthorizedException and records audit event when password is invalid', async () => {
    const request = {
      requestId: 'req-2',
      ip: '127.0.0.1',
      userAgent: 'jest',
    };

    mockQueryBuilder.getOne.mockResolvedValue({
      id: 'user-2',
      email: 'bob@example.com',
      passwordHash: 'hashed-password',
      roles: [ERoles.ADMIN],
      scopes: [EOrderScopes.ORDER_WRITE],
    });

    compareMock.mockResolvedValue(false as never);

    await expect(
      service.login(
        {
          email: 'bob@example.com',
          password: 'wrong-password',
        },
        request,
      ),
    ).rejects.toThrow(UnauthorizedException);

    expect(mockJwtService.sign).not.toHaveBeenCalled();
    expect(mockAuditService.recordWithRequest).toHaveBeenCalledWith(
      {
        action: AuditAction.AuthLoginFailed,
        actor: {
          id: 'user-2',
          roles: [ERoles.ADMIN],
          scopes: [EOrderScopes.ORDER_WRITE],
        },
        targetType: 'user',
        targetId: 'user-2',
        outcome: 'failure',
        reason: 'invalid_credentials',
      },
      request,
    );
  });
});
