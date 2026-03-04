import { Module } from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxEvent } from 'src/database/entities';
import { OutboxRelayService } from './outbox-relay.service';
import { RabbitmqModule } from 'src/rabbitmq/rabbitmq.module';

@Module({
  imports: [TypeOrmModule.forFeature([OutboxEvent]), RabbitmqModule],
  providers: [OutboxService,OutboxRelayService],
  exports: [OutboxService, OutboxRelayService],
})
export class OutboxModule {}
