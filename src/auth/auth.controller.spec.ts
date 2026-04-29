import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthUser } from './types';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';

describe('AuthController', () => {
  let controller: AuthController;

  type AuditRequest = Request & {
    requestId?: string;
  };

  type AuthenticatedRequest = Request & {
    user: AuthUser;
  };

  const mockAuthService = {
    login: jest.fn(),
  };

  const mockUsersService = {
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates login to AuthService with audit request context', async () => {
    const dto: LoginDto = {
      email: 'alice@example.com',
      password: 'secret',
    };
    const req: AuditRequest = {
      requestId: 'req-1',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'jest',
      },
    } as AuditRequest;

    mockAuthService.login.mockResolvedValue({
      accessToken: 'jwt-token',
    });

    const result = await controller.login(dto, req);

    expect(mockAuthService.login).toHaveBeenCalledWith(dto, {
      requestId: 'req-1',
      ip: '127.0.0.1',
      userAgent: 'jest',
    });
    expect(result).toEqual({
      accessToken: 'jwt-token',
    });
  });

  it('returns req.user in me()', () => {
    const user: AuthUser = {
      sub: 'user-1',
      email: 'alice@example.com',
      roles: [],
      scopes: [],
    };

    const req: AuthenticatedRequest = { user } as AuthenticatedRequest;
    const result = controller.me(req);

    expect(result).toBe(user);
  });

  it('updates current user profile using req.user.sub', async () => {
    const user: AuthUser = {
      sub: 'user-1',
      email: 'alice@example.com',
      roles: [],
      scopes: [],
    };
    const dto = {
      firstName: 'Alice',
      lastName: 'Updated',
    };
    const updatedUser = {
      id: 'user-1',
      email: 'alice@example.com',
      firstName: 'Alice',
      lastName: 'Updated',
    };

    mockUsersService.update.mockResolvedValue(updatedUser);

    const req: AuthenticatedRequest = { user } as AuthenticatedRequest;
    const result = await controller.updateMe(req, dto);

    expect(mockUsersService.update).toHaveBeenCalledWith('user-1', dto);
    expect(result).toEqual(updatedUser);
  });
});
