import { Module } from '@nestjs/common';
import { OrdersV1Controller } from './v1/orders.controller.v1';
import { OrdersService } from './orders.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItem, Order, Product, User } from 'src/database/entities';
import { OrdersEventsService } from './orders-events.service';
import { RabbitmqModule } from 'src/rabbitmq/rabbitmq.module';
import { OrdersProcessorConsumer } from './orders-processor.consumer';
import { OutboxModule } from 'src/outbox/outbox.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Product, User]), RabbitmqModule, OutboxModule],
  controllers: [OrdersV1Controller],
  providers: [OrdersService, OrdersEventsService, OrdersProcessorConsumer],
  exports: [OrdersEventsService, OrdersService]
})
export class OrdersModule {}
