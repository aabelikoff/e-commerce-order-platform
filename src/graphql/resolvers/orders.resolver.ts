import {
  Resolver,
  Query,
  Args,
  ResolveField,
  Parent,
  Context,
} from '@nestjs/graphql';
import { Logger, UseFilters } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrdersService } from '../services/orders.service';
import { OrderModel } from '../models/orders/order.model';
import { OrdersConnection } from '../models/orders/orders-connection.model';
import { OrdersFilterInput } from '../models/orders/orders-filter.input';
import { PaginationCursorInput } from '../models/common/pagination-cursor.input';
import { OrderItemModel } from '../models/orders/order-item.model';
import { ProductModel } from '../models/product.model';
// import { Product, Order, User, OrderItem } from '../../database/entities';
import { EntityModelMapper } from '../utils/entity-modes.mapper';
import { UserModel } from '../models/user.model';
import { type GraphQLContext } from '../loaders/loaders.types';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../auth/guards/gql-auth.guard';
import { GqlAllExceptionsFilter } from 'src/common/filters/gql-exception.filter';
import { PaymentModel } from '../models/payment.model';

@UseFilters(GqlAllExceptionsFilter)
@Resolver(() => OrderModel)
export class OrdersResolver {
  private readonly logger = new Logger(OrdersResolver.name);

  constructor(
    private readonly ordersService: OrdersService,
    // @InjectRepository(Product)
    // private readonly productRepo: Repository<Product>,
    // @InjectRepository(OrderItem)
    // private readonly orderItemRepo: Repository<OrderItem>,
    // @InjectRepository(User)
    // private readonly userRepo: Repository<User>,
  ) {}
  @UseGuards(GqlAuthGuard)
  @Query(() => OrderModel, { name: 'order' })
  async order(
    @Args('id', { type: () => String }) id: string,
  ): Promise<OrderModel> {
    return this.ordersService.findOrder(id);
  }

  // @UseGuards(GqlAuthGuard)
  @Query(() => OrdersConnection, { name: 'orders' })
  async orders(
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
        userId: order.userId,
        items: [],
        payments: [],
      })),
      pageInfo: result.pageInfo,
      totalCount: result.totalCount,
    };
  }

  @ResolveField(() => [OrderItemModel], { name: 'items' })
  async items(
    @Parent() order: OrderModel,
    @Context() ctx: GraphQLContext,
  ): Promise<OrderItemModel[]> {
    this.logger.log(`📦 ResolveField items for order ${order.id}`);

    // const items = await this.orderItemRepo.find({
    //   where: { order: { id: order.id } },
    // });

    const items = await ctx.loaders.orderItemsByOrderIdLoader.load(order.id);

    return (items ?? []).map((item) => ({
      id: item.id,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      productId: item.productId,
    }));
  }

  @ResolveField(() => UserModel, { name: 'user' })
  async user(
    @Parent() order: OrderModel,
    @Context() ctx: GraphQLContext,
  ): Promise<UserModel> {
    this.logger.log(`👤 ResolveField user for order ${order.id}`);

    // const user = await this.userRepo.findOne({
    //   where: { id: order.userId },
    // });

    const user = await ctx.loaders.userByIdLoader.load(order.userId);

    if (!user) throw new Error(`User not found: ${order.userId}`);

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    } as UserModel;
  }

  @ResolveField(() => [PaymentModel], { name: 'payments' })
  async payments(
    @Parent() order: OrderModel,
    @Context() ctx: GraphQLContext,
  ): Promise<PaymentModel[]> {
    this.logger.log(`📦 ResolveField payments for order ${order.id}`);

    const payments = await ctx.loaders.paymentsByOrderIdLoader.load(order.id);

    return (payments ?? []).map((payment) => ({
      id: payment.id,
      status: payment.status,
      paidAt: payment.paidAt,
      paidAmount: payment.paidAmount,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    }));
  }
}

@UseFilters(GqlAllExceptionsFilter)
@Resolver(() => OrderItemModel)
export class OrderItemResolver {
  private readonly logger = new Logger(OrderItemResolver.name);
  private readonly mapper = EntityModelMapper.createMapper();
  constructor() {
    // @InjectRepository(Product)
    // private readonly productRepo: Repository<Product>,
  }

  @ResolveField(() => ProductModel, { name: 'product' })
  async product(
    @Parent() orderItem: OrderItemModel,
    @Context() ctx: GraphQLContext,
  ): Promise<ProductModel> {
    // this.logger.warn(`🔴 N+1: Loading product for item ${orderItem.id}`);
    // const product = await this.productRepo.findOne({
    //   where: { id: orderItem.productId },
    // });

    this.logger.debug(`Resolving product for item ${orderItem.id}`);
    const product = await ctx.loaders.productByIdLoader.load(
      orderItem.productId,
    );

    if (!product) throw new Error(`Product not found: ${orderItem.productId}`);

    return this.mapper.productMapper(product);
  }
}
