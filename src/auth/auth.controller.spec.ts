import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthUser } from './types';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    login: jest.fn(),
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
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates login to AuthService with audit request context', async () => {
    const dto = {
      email: 'alice@example.com',
      password: 'secret',
    };
    const req = {
      requestId: 'req-1',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'jest',
      },
    };

    mockAuthService.login.mockResolvedValue({
      accessToken: 'jwt-token',
    }); 

    const result = await controller.login(dto, req as any);

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

    const result = controller.me({ user } as any);

    expect(result).toBe(user);
  });
});
