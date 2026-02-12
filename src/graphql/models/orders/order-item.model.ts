import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import { EOrderStatus } from '../enums/order-status.gql';
import { ProductModel } from '../product.model';

@ObjectType()
export class OrderItemModel {
  @Field(() => ID)
  id: string;

  @Field(() => Int, {nullable: false})
  quantity: number;

  @Field(() => Float)
  unitPrice: number;

   @Field(() => ID)
  productId: string;

  @Field(() => ProductModel, { nullable: true })
  product?: ProductModel;
}