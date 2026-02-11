import {
  Field,
  GraphQLISODateTime,
  ID,
  ObjectType,
  Int,
  HideField,
} from '@nestjs/graphql';
import { EOrderStatus } from 'src/database/entities';
import { UserModel } from '../user.model';
import { OrderModel } from './order.model';
import { ProductModel } from '../product.model';

@ObjectType({ description: 'OrderItem model' })
export class OrderItemModel {
  @Field(() => ID)
  id: string;

  @Field(() => ProductModel)
  product?: ProductModel | null;

  @HideField()
  productId: string;

  @Field(() => Int)
  quantity: number;

  @Field(() => String)
  discountAmount: string;
}
