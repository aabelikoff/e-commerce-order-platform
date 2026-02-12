import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { EOrderStatus } from '../enums/order-status.gql';
import { OrderItemModel } from './order-item.model';
import { UserModel } from '../user.model';

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

  @Field(() => ID)
  userId: string;

  @Field(() => UserModel, { nullable: true })
  user?: UserModel;

  @Field(() => [OrderItemModel], { nullable: 'itemsAndList' })
  items?: OrderItemModel[];
}
