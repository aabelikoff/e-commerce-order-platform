// src/orders/orders.resolver.ts
import { Resolver, Query, Args, ResolveField, Parent } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrdersService } from '../services/orders.service';
import { OrderModel } from '../models/orders/order.model';
import { OrdersConnection } from '../models/orders/orders-connection.model';
import { OrdersFilterInput } from '../models/orders/orders-filter.input';
import { PaginationCursorInput } from '../models/common/pagination-cursor.input';
import { OrderItemModel } from '../models/orders/order-item.model';
import { ProductModel } from '../models/product.model';
import { Product, Order, User, OrderItem } from '../../database/entities';
import { EntityModelMapper } from '../utils/entitie-modes.mapper';

@Resolver(() => OrderModel)
export class OrdersResolver {
  private readonly logger = new Logger(OrdersResolver.name);

  constructor(
    private readonly ordersService: OrdersService,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
  ) {}

  @Query(() => OrdersConnection, { name: 'orders' })
  async getOrders(
    @Args('filter', { nullable: true }) filter?: OrdersFilterInput,
    @Args('pagination', { nullable: true }) pagination?: PaginationCursorInput,
  ): Promise<OrdersConnection> {
    this.logger.log('📊 Query: orders');
    const result = await this.ordersService.findOrders(filter, pagination);

    return {
      nodes: result.nodes.map((order) => ({
        id: order.id,
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        items: order.items,
      })),
      pageInfo: result.pageInfo,
      totalCount: result.totalCount,
    };
  }

  // @ResolveField(() => [OrderItemModel], { name: 'items' })
  // async getItems(@Parent() order: Order): Promise<OrderItemModel[]> {
  //   this.logger.log(`📦 Loading items for order ${order.id}`);

  //   const items = await this.orderItemRepo.find({
  //     where: { orderId: order.id },
  //   });

  //   return items.map(
  //     (item) =>
  //       ({
  //         id: item.id,
  //         quantity: Number(item.quantity),
  //         unitPrice: Number(item.unitPrice),
  //         product: null as any,
  //       }) as OrderItemModel,
  //   );
  // }
}

@Resolver(() => OrderItemModel)
export class OrderItemResolver {
  private readonly logger = new Logger(OrderItemResolver.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  // ❌ ВОТ ТУТ N+1 ПРОБЛЕМА!
  // Для каждого OrderItem делается отдельный запрос к Product
  @ResolveField(() => ProductModel, { name: 'product' })
  async getProduct(
    @Parent() orderItem: OrderItem,
  ): Promise<ProductModel | null> {
    this.logger.warn(`🔴 N+1: Loading product for item ${orderItem.id}`);

    const product = await this.productRepo.findOne({
      where: { id: orderItem.productId },
    });

    if (product) {
      return EntityModelMapper.createMapper().productMapper(product);
    }
    return null;
  }
}
