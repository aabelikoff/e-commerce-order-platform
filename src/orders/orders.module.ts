import { Module } from '@nestjs/common';
import { OrdersV1Controller } from './v1/orders.controller.v1';
import { OrdersService } from './orders.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItem, Order, Product, User } from 'src/database/entities';
import { OrdersEventsService } from './orders-events.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Product, User])],
  controllers: [OrdersV1Controller],
  providers: [OrdersService, OrdersEventsService],
  exports: [OrdersEventsService, OrdersService]
})
export class OrdersModule {}
