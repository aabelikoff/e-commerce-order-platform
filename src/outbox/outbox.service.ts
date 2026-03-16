import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OutboxEvent, EOutboxEventStatus } from 'src/database/entities';
import { EntityManager, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { IRabbitMq } from 'src/config/rabbitmq';

@Injectable()
export class OutboxService {
  constructor(
    @InjectRepository(OutboxEvent)
    private readonly outboxRepository: Repository<OutboxEvent>,
    private readonly configService: ConfigService,
  ) {}

  async add(
    aggregateType: string,
    aggregateId: string,
    eventType: string,
    payload: Record<string, unknown>,
    manager?: EntityManager,
  ): Promise<OutboxEvent> {
    const repo = manager
      ? manager.getRepository(OutboxEvent)
      : this.outboxRepository;

    const message = repo.create({
      aggregateType,
      aggregateId,
      eventType,
      payload,
      status: EOutboxEventStatus.PENDING,
      attempts: 0,
      nextRetryAt: new Date(),
    });

    return repo.save(message);
  }

  async claimBatch(
    manager?: EntityManager,
    limit?: number,
  ): Promise<OutboxEvent[]> {
    const repo = manager
      ? manager.getRepository(OutboxEvent)
      : this.outboxRepository;
    const batchSize =
      limit ??
      this.configService.get<IRabbitMq['outboxRelayBatchSize']>(
        'rabbitMq.outboxRelayBatchSize',
      ) ??
      50;
    const maxAttempts =
      this.configService.get<IRabbitMq['maxAttempts']>('rabbitMq.maxAttempts') ??
      3;

    return repo
      .createQueryBuilder('e')
      .where('e.status IN (:...statuses)', {
        statuses: [EOutboxEventStatus.PENDING, EOutboxEventStatus.FAILED],
      })
      .andWhere('e.attempts < :maxAttempts', { maxAttempts })
      .andWhere('(e.next_retry_at IS NULL OR e.next_retry_at <= now())')
      .orderBy('e.created_at', 'ASC')
      .limit(batchSize)
      .setLock('pessimistic_write')
      .setOnLocked('skip_locked')
      .getMany();
  }

  async markSent(id: string, manager?: EntityManager) {
    const repo = manager
      ? manager.getRepository(OutboxEvent)
      : this.outboxRepository;

    return repo.update(
      { id },
      { status: EOutboxEventStatus.SENT, lastError: null, sentAt: new Date() },
    );
  }

  async markFailed(
    id: string,
    lastError: string | null,
    nextRetryAt: Date | null,
    manager?: EntityManager,
  ) {
    const repo = manager
      ? manager.getRepository(OutboxEvent)
      : this.outboxRepository;

    return repo.update(
      { id },
      {
        lastError,
        nextRetryAt,
        status: EOutboxEventStatus.FAILED,
        attempts: () => '"attempts"+1',
      },
    );
  }
}
