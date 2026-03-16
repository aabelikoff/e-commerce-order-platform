import { Module } from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxEvent } from '../database/entities';
import { OutboxRelayService } from './outbox-relay.service';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';
import { KafkaModule } from '../kafka/kafka.module';

@Module({
  imports: [TypeOrmModule.forFeature([OutboxEvent]), RabbitmqModule, KafkaModule],
  providers: [OutboxService,OutboxRelayService],
  exports: [OutboxService, OutboxRelayService],
})
export class OutboxModule {}
