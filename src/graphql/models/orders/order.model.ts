import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';
import { EOrderStatus } from '../enums/order-status.gql';
import { UserModel } from '../user.model';
import { OrderItemModel } from './order-item.model';
import { PageInfo } from '../common/cursor.model';

@ObjectType({ description: 'Order model' })
export class OrderModel {
  @Field(() => ID)
  id: string;

  @Field(() => EOrderStatus, { nullable: true })
  status?: EOrderStatus;

  @Field(() => String)
  itemsSubtotal: string;

  @Field(() => String)
  itemsDiscountTotal: string;

  @Field(() => String)
  shippingAmount: string;

  @Field(() => String)
  orderDiscountAmount: string;

  @Field(() => String)
  totalAmount: string;

  @Field(() => String)
  paidAmount: string;

  @Field(() => UserModel)
  user: UserModel;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => [OrderItemModel], { nullable: 'itemsAndList' })
  items: OrderItemModel[];
}

@ObjectType()
export class OrdersPage {
  @Field(() => [OrderModel])
  items!: OrderModel[];

  @Field(() => PageInfo)
  pagination!: PageInfo;
}
