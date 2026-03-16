import { Test, TestingModule } from '@nestjs/testing';
import { OutboxRelayService } from '../outbox/outbox-relay.service';

describe('OutboxRelayService', () => {
  let service: OutboxRelayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OutboxRelayService],
    }).compile();

    service = module.get<OutboxRelayService>(OutboxRelayService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
