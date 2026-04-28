import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from 'typeorm';
import { OutboxEvent, EOutboxEventStatus } from 'src/database/entities';
import { OutboxService } from './outbox.service';

describe('OutboxService', () => {
  let service: OutboxService;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    setOnLocked: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const mockOutboxRepository = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    update: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockManagerRepository = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    update: jest.fn(),
  };

  const mockManager = {
    getRepository: jest.fn(() => mockManagerRepository),
  } as unknown as EntityManager;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxService,
        {
          provide: getRepositoryToken(OutboxEvent),
          useValue: mockOutboxRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<OutboxService>(OutboxService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('adds event using repository when manager is not provided', async () => {
    const savedEvent = { id: 'event-1' };
    mockOutboxRepository.create.mockImplementation((value) => value);
    mockOutboxRepository.save.mockResolvedValue(savedEvent);

    const result = await service.add('order', 'aggregate-1', 'order.placed', {
      ok: true,
    });

    expect(mockOutboxRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: 'order',
        aggregateId: 'aggregate-1',
        eventType: 'order.placed',
        payload: { ok: true },
        status: EOutboxEventStatus.PENDING,
        attempts: 0,
        nextRetryAt: expect.any(Date),
      }),
    );
    expect(mockOutboxRepository.save).toHaveBeenCalled();
    expect(result).toBe(savedEvent);
  });

  it('adds event using manager repository when manager is provided', async () => {
    const savedEvent = { id: 'event-2' };
    mockManagerRepository.create.mockImplementation((value) => value);
    mockManagerRepository.save.mockResolvedValue(savedEvent);

    const result = await service.add(
      'order',
      'aggregate-2',
      'order.process_requested',
      { id: 1 },
      mockManager,
    );

    expect((mockManager as any).getRepository).toHaveBeenCalledWith(
      OutboxEvent,
    );
    expect(mockManagerRepository.create).toHaveBeenCalled();
    expect(mockManagerRepository.save).toHaveBeenCalled();
    expect(result).toBe(savedEvent);
  });

  it('claims batch with config defaults from ConfigService', async () => {
    const events = [{ id: 'event-1' }];
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'rabbitMq.outboxRelayBatchSize') return 25;
      if (key === 'rabbitMq.maxAttempts') return 5;
      return undefined;
    });
    mockQueryBuilder.getMany.mockResolvedValue(events);

    const result = await service.claimBatch();

    expect(mockOutboxRepository.createQueryBuilder).toHaveBeenCalledWith('e');
    expect(mockQueryBuilder.where).toHaveBeenCalledWith(
      'e.status IN (:...statuses)',
      {
        statuses: [EOutboxEventStatus.PENDING, EOutboxEventStatus.FAILED],
      },
    );
    expect(mockQueryBuilder.andWhere).toHaveBeenNthCalledWith(
      1,
      'e.attempts < :maxAttempts',
      { maxAttempts: 5 },
    );
    expect(mockQueryBuilder.andWhere).toHaveBeenNthCalledWith(
      2,
      '(e.next_retry_at IS NULL OR e.next_retry_at <= now())',
    );
    expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
      'e.created_at',
      'ASC',
    );
    expect(mockQueryBuilder.limit).toHaveBeenCalledWith(25);
    expect(mockQueryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(mockQueryBuilder.setOnLocked).toHaveBeenCalledWith('skip_locked');
    expect(result).toBe(events);
  });

  it('claims batch using explicit limit over config value', async () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'rabbitMq.outboxRelayBatchSize') return 50;
      if (key === 'rabbitMq.maxAttempts') return 3;
      return undefined;
    });
    mockQueryBuilder.getMany.mockResolvedValue([]);

    await service.claimBatch(undefined, 7);

    expect(mockQueryBuilder.limit).toHaveBeenCalledWith(7);
  });

  it('marks event as sent using repository', async () => {
    mockOutboxRepository.update.mockResolvedValue({ affected: 1 });

    await service.markSent('event-1');

    expect(mockOutboxRepository.update).toHaveBeenCalledWith(
      { id: 'event-1' },
      {
        status: EOutboxEventStatus.SENT,
        lastError: null,
        sentAt: expect.any(Date),
      },
    );
  });

  it('marks event as failed using repository', async () => {
    const retryAt = new Date('2026-01-02T00:00:00.000Z');
    mockOutboxRepository.update.mockResolvedValue({ affected: 1 });

    await service.markFailed('event-2', 'boom', retryAt);

    expect(mockOutboxRepository.update).toHaveBeenCalledWith(
      { id: 'event-2' },
      {
        lastError: 'boom',
        nextRetryAt: retryAt,
        status: EOutboxEventStatus.FAILED,
        attempts: expect.any(Function),
      },
    );
  });

  it('marks event as sent using manager repository', async () => {
    mockManagerRepository.update.mockResolvedValue({ affected: 1 });

    await service.markSent('event-3', mockManager);

    expect(mockManagerRepository.update).toHaveBeenCalled();
  });

  it('marks event as failed using manager repository', async () => {
    mockManagerRepository.update.mockResolvedValue({ affected: 1 });

    await service.markFailed('event-4', null, null, mockManager);

    expect(mockManagerRepository.update).toHaveBeenCalled();
  });
});
