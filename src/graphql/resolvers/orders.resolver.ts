import {
  Resolver,
  Query,
  Args,
  ResolveField,
  Parent,
  Context,
  ID,
} from '@nestjs/graphql';
import { OrderModel, OrdersPage } from '../models/orders/order.model';
import { OrdersQlService } from '../services/orders-ql.service';
import { OrdersQueryArgs } from '../models/orders/orders-query.args';
import { Order } from 'src/database/entities';
import { PageInfo } from '../models/common/cursor.model';
import { UserModel } from '../models/user.model';
import { OrderItemModel } from '../models/orders/order-item.model';
import { ProductModel } from '../models/product.model';
import type { GraphQLContext } from '../loaders/loaders.types';

@Resolver()
export class OrdersResolver {
  constructor(private readonly ordersService: OrdersQlService) {}

  @Query(() => OrdersPage)
  async orders(@Args() args: OrdersQueryArgs): Promise<OrdersPage> {
    return this.ordersService.listOrders(args);
  }

  @Query(() => OrderModel, {nullable: true})
  async order(@Args('id', { type: () => ID }) id: string) {
    return this.ordersService.findById(id);
  }
}

