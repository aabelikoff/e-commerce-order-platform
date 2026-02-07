import { Module } from '@nestjs/common';
import { OrdersV1Controller } from './v1/orders.controller.v1';
import { OrdersService } from './orders.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItem, Order, Product, User } from 'src/database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Product, User])],
  controllers: [OrdersV1Controller],
  providers: [OrdersService],
})
export class OrdersModule {}
