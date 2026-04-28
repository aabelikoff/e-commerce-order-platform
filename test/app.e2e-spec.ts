import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { HealthController } from '../src/health/health.controller';
import { HealthService } from '../src/health/health.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('App bootstrap (e2e)', () => {
  let app: INestApplication;

  const mockHealthService = {
    getReadiness: jest.fn(),
  };

  const getHttpServer = (): Parameters<typeof request>[0] =>
    app.getHttpServer() as Parameters<typeof request>[0];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', {
      exclude: ['health', 'ready'],
    });
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
    mockHealthService.getReadiness.mockResolvedValue({
      status: 'ready',
      checks: {
        database: 'up',
        payments: 'up',
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves /health without response wrapping', async () => {
    const response = await request(getHttpServer()).get('/health').expect(200);

    expect(response.body).toEqual({ status: 'ok' });
  });

  it('serves /ready and delegates readiness checks', async () => {
    const response = await request(getHttpServer()).get('/ready').expect(200);

    expect(mockHealthService.getReadiness).toHaveBeenCalled();
    expect(response.body).toEqual({
      status: 'ready',
      checks: {
        database: 'up',
        payments: 'up',
      },
    });
  });
});
