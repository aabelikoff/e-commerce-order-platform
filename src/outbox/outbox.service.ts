import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OutboxEvent, EOutboxEventStatus } from 'src/database/entities';
import { EntityManager, Repository } from 'typeorm';

@Injectable()
export class OutboxService {
  constructor(
    @InjectRepository(OutboxEvent)
    private readonly outboxRepository: Repository<OutboxEvent>,
  ) {}

  async add(
    aggregateType: string,
    aggregateId: string,
    eventType: string,
    payload: Record<string, unknown>,
    manager?: EntityManager,
  ): Promise<OutboxEvent> {
    const repo = manager ? manager.getRepository(OutboxEvent) : this.outboxRepository;

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
}