import { ObjectType, Field, Int } from '@nestjs/graphql';
import { OrderModel } from './order.model';
import { PageInfo } from '../common/page-info.model';

@ObjectType()
export class OrdersConnection {
  @Field(() => [OrderModel], { nullable: false })
  nodes: OrderModel[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;

  @Field(() => Int)
  totalCount: number;
}