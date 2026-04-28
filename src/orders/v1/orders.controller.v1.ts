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
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { IdempotencyKey } from '../../common/decorators/idempotancy-key.decorator';
import { OrdersService } from './../orders.service';
import { OrderResponseInterceptor } from './interceptors/order-response-status.interceptor';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AccessGuard } from '../../auth/guards/access.guard';
import { Scopes, Roles } from '../../auth/decorators';
import { AuthUser } from '../../auth/types';
import { EOrderScopes } from '../../auth/access/scopes';
import { Request } from 'express';
import { ERoles } from '../../auth/access/roles';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CursorPaginationQueryDto } from '../../common/dto/cursor-pagination-query.dto';
import { AdminWritesThrottle } from '../../common/decorators';
import { buildAuditRequestContext } from '../../common/audit';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  OrdersListResponseDto,
  OrderResponseDto,
} from './dto/order-response.dto';
import {
  ApiCreatedWrappedResponse,
  ApiOkWrappedResponse,
} from '../../common/decorators';

@UseGuards(JwtAuthGuard, AccessGuard)
@Controller('orders')
@ApiTags('orders')
@ApiBearerAuth()
export class OrdersV1Controller {
  constructor(private orderService: OrdersService) {}

  @Scopes(EOrderScopes.ORDER_WRITE)
  @Post()
  @UseInterceptors(OrderResponseInterceptor)
  @ApiOperation({ summary: 'Create a new order' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Unique key to safely retry order creation',
  })
  @ApiCreatedWrappedResponse(OrderResponseDto)
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  @ApiForbiddenResponse({ description: 'Insufficient scope or role' })
  async create(
    @Body() dto: CreateOrderDto,
    @IdempotencyKey() idempotencyKey: string,
  ) {
    return await this.orderService.create(dto, idempotencyKey);
  }

  @Scopes(EOrderScopes.ORDER_READ)
  @Get()
  @UseInterceptors(OrderResponseInterceptor)
  @ApiOperation({ summary: 'List orders available to the current user' })
  @ApiOkWrappedResponse(OrdersListResponseDto)
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  @ApiForbiddenResponse({ description: 'Insufficient scope or role' })
  async getAll(
    @Req() req: Request & { user: AuthUser },
    @Query() query: CursorPaginationQueryDto,
  ) {
    const user = req.user;
    return await this.orderService.findAll(user, query);
  }

  @Scopes(EOrderScopes.ORDER_READ)
  @Get(':id')
  @UseInterceptors(OrderResponseInterceptor)
  @ApiOperation({ summary: 'Get order by id' })
  @ApiParam({ name: 'id', description: 'Order id (UUID)' })
  @ApiOkWrappedResponse(OrderResponseDto)
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  @ApiForbiddenResponse({ description: 'Insufficient scope or role' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  async getOne(
    @Req() req: Request & { user: AuthUser },
    @Param('id') id: string,
  ) {
    const user = req.user;
    return await this.orderService.findOne(user, id);
  }

  @Roles(ERoles.ADMIN)
  @Patch(':id/status')
  @AdminWritesThrottle()
  @ApiOperation({ summary: 'Update order status (admin only)' })
  @ApiParam({ name: 'id', description: 'Order id (UUID)' })
  @ApiOkWrappedResponse(OrderResponseDto)
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req: Request & { user: AuthUser },
  ) {
    return await this.orderService.updateStatus(
      id,
      dto.status,
      req.user,
      buildAuditRequestContext(req),
    );
  }

  @Roles(ERoles.ADMIN)
  @HttpCode(204)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete order by id (admin only)' })
  @ApiParam({ name: 'id', description: 'Order id (UUID)' })
  @ApiNoContentResponse({ description: 'Order deleted' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  async delete(@Param('id') id: string) {
    return await this.orderService.delete(id);
  }
}
