import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CreateOrderDto } from './dto/create-order.dto';
import { ParseUUIDPipe } from '@nestjs/common';
import { IdempotencyKey } from 'src/common/decorators/idempotancy-key.decorator';
import { OrdersService } from './../orders.service';

@Controller('orders')
export class OrdersV1Controller {
  constructor(private orderService: OrdersService) {}

  @Post()
  @HttpCode(201)
  async create(
    @Body() dto: CreateOrderDto,
    @IdempotencyKey() idempotencyKey: string,
    @Res() res: Response,
  ) {
    const { order, created } = await this.orderService.create(
      dto,
      idempotencyKey,
    );
    if (created) {
      res.status(200).json(order);
    }
    return order;
  }

  
}
