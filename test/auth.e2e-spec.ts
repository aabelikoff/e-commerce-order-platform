import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { VersioningType } from '@nestjs/common';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { ERoles } from '../src/auth/access/roles';
import { EOrderScopes } from '../src/auth/access/scopes';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

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

    throw new UnauthorizedException('Unauthorized');
  }
}

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  const mockAuthService = {
    login: jest.fn(),
  };

  const getHttpServer = (): Parameters<typeof request>[0] =>
    app.getHttpServer() as Parameters<typeof request>[0];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
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
    mockAuthService.login.mockResolvedValue({
      accessToken: 'jwt-token',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs in and returns wrapped access token', async () => {
    const response = await request(getHttpServer())
      .post('/api/v1/auth/login')
      .set('User-Agent', 'jest-e2e')
      .send({
        email: '  ALICE@EXAMPLE.COM ',
        password: 'secret123',
      })
      .expect(201);

    expect(mockAuthService.login).toHaveBeenCalledWith(
      {
        email: 'alice@example.com',
        password: 'secret123',
      },
      {
        requestId: undefined,
        ip: expect.any(String),
        userAgent: 'jest-e2e',
      },
    );
    expect(response.body.data).toEqual({
      accessToken: 'jwt-token',
    });
    expect(response.body.meta).toEqual(
      expect.objectContaining({
        timestamp: expect.any(String),
      }),
    );
  });

  it('returns validation problem details for invalid login payload', async () => {
    const response = await request(getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'not-an-email',
      })
      .expect(400);

    expect(response.headers['content-type']).toContain(
      'application/problem+json',
    );
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 400,
        title: 'Bad Request',
        code: 'HTTP_EXCEPTION',
        errors: expect.arrayContaining([
          expect.stringContaining('email'),
          expect.stringContaining('password'),
        ]),
      }),
    );
  });

  it('returns unauthorized for /auth/me without bearer token', async () => {
    const response = await request(getHttpServer())
      .get('/api/v1/auth/me')
      .expect(401);

    expect(response.body).toEqual(
      expect.objectContaining({
        status: 401,
        title: 'Unauthorized',
      }),
    );
  });

  it('returns authenticated user for /auth/me', async () => {
    const response = await request(getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer user-token')
      .expect(200);

    expect(response.body.data).toEqual({
      sub: 'user-1',
      email: 'alice@example.com',
      roles: [ERoles.USER],
      scopes: [EOrderScopes.ORDER_READ, EOrderScopes.ORDER_WRITE],
    });
  });
});
