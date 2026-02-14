import { ObjectType, Field, ID, Float, GraphQLISODateTime } from '@nestjs/graphql';
import { EOrderStatus } from '../enums/order-status.gql';
import { OrderItemModel } from './order-item.model';
import { UserModel } from '../user.model';

@ObjectType({
  description: 'Represents a customer order in the system',
})
export class OrderModel {
  @Field(() => ID, {
    description: 'Unique identifier of the order (UUID)',
  })
  id: string;

  @Field(() => EOrderStatus, {
    description: 'Current status of the order (PENDING, PAID, SHIPPED, CANCELLED)',
  })
  status: EOrderStatus;

  @Field(() => Float, {
    description: 'Total monetary amount of the order at the time of query',
  })
  totalAmount: number;

  @Field(() => GraphQLISODateTime, {
    description: 'Timestamp when the order was created',
  })
  createdAt: Date;

  @Field(() => ID, {
    description: 'Identifier of the user who created the order',
  })
  userId: string;

  @Field(() => UserModel, {
    nullable: false,
    description: 'User who created the order (resolved field)',
  })
  user?: UserModel;

  @Field(() => [OrderItemModel], {
    nullable: false,
    description: 'List of items included in the order',
  })
  items: OrderItemModel[];
}