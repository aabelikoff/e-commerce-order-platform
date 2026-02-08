import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { IdempotencyKey } from 'src/common/decorators/idempotancy-key.decorator';
import { OrdersService } from './../orders.service';
import { OrderResponseInterceptor } from './interceptors/order-response-status.interceptor';

@Controller('orders')
export class OrdersV1Controller {
  constructor(private orderService: OrdersService) {}
  
  @Post()
  @UseInterceptors(OrderResponseInterceptor)
  async create(
    @Body() dto: CreateOrderDto,
    @IdempotencyKey() idempotencyKey: string,
  ) {
    return await this.orderService.create(dto, idempotencyKey);
  }
}
