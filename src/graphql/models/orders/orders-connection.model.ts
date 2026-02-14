import { ObjectType, Field, Int } from '@nestjs/graphql';
import { OrderModel } from './order.model';
import { PageInfo } from '../common/page-info.model';

@ObjectType({
  description:
    'Paginated list of orders following the Connection pattern',
})
export class OrdersConnection {
  @Field(() => [OrderModel], {
    nullable: false,
    description: 'List of orders matching the provided filter and pagination',
  })
  nodes: OrderModel[];

  @Field(() => PageInfo, {
    description: 'Pagination metadata (cursor and navigation state)',
  })
  pageInfo: PageInfo;

  @Field(() => Int, {
    description: 'Total number of orders matching the filter (ignores pagination limit)',
  })
  totalCount: number;
}