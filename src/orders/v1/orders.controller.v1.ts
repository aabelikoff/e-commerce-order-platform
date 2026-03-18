import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { IdempotencyKey } from 'src/common/decorators/idempotancy-key.decorator';
import { OrdersService } from './../orders.service';
import { OrderResponseInterceptor } from './interceptors/order-response-status.interceptor';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AccessGuard } from 'src/auth/guards/access.guard';
import { Scopes, Roles } from '../../auth/decorators';
import { AuthUser } from 'src/auth/types';
import { EOrderScopes } from 'src/auth/access/scopes';
import { Request } from 'express';
import { ERoles } from 'src/auth/access/roles';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@UseGuards(JwtAuthGuard, AccessGuard)
@Controller('orders')
export class OrdersV1Controller {
  constructor(private orderService: OrdersService) {}

  @Scopes(EOrderScopes.ORDER_WRITE)
  @Post()
  @UseInterceptors(OrderResponseInterceptor)
  async create(
    @Body() dto: CreateOrderDto,
    @IdempotencyKey() idempotencyKey: string,
  ) {
    return await this.orderService.create(dto, idempotencyKey);
  }

  @Scopes(EOrderScopes.ORDER_READ)
  @Get()
  @UseInterceptors(OrderResponseInterceptor)
  async getAll(@Req() req: Request & { user: AuthUser }) {
    const user = req.user;
    return await this.orderService.findAll(user);
  }

  @Scopes(EOrderScopes.ORDER_READ)
  @Get(':id')
  @UseInterceptors(OrderResponseInterceptor)
  async getOne(
    @Req() req: Request & { user: AuthUser },
    @Param('id') id: string,
  ) {
    const user = req.user;
    return await this.orderService.findOne(user, id);
  }

  @Roles(ERoles.ADMIN)
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    return await this.orderService.updateStatus(id, dto.status, req.user);
  }

  @Roles(ERoles.ADMIN)
  @HttpCode(204)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this.orderService.delete(id);
  }
}
