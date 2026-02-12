import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { EOrderStatus } from '../enums/order-status.gql';
import { OrderItemModel } from './order-item.model';

@ObjectType()
export class OrderModel {
  @Field(() => ID)
  id: string;

  @Field(() => EOrderStatus)
  status: EOrderStatus;

  @Field(() => Float)
  totalAmount: number;

  @Field()
  createdAt: Date;

  @Field(() => [OrderItemModel], { nullable: true })
  items: OrderItemModel[];
}
