import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import { EOrderStatus } from '../enums/order-status.gql';
import { ProductModel } from '../product.model';

@ObjectType({
  description:
    'Represents a single product entry within an order. ' +
    'Each order item stores quantity and price snapshot at the moment of purchase.',
})
export class OrderItemModel {
  @Field(() => ID, {
    description:
      'Unique identifier of the order item (UUID). ' +
      'Each item corresponds to one product within a specific order.',
  })
  id: string;

  @Field(() => Int, {
    description:
      'Number of units of the product included in this order item. ' +
      'Must be greater than zero.',
  })
  quantity: number;

  @Field(() => Float, {
    description:
      'Unit price of the product at the time the order was created. ' +
      'This is a price snapshot and does not change even if the product price is later updated.',
  })
  unitPrice: number;

  @Field(() => ID, {
    description:
      'Identifier of the associated product. ' +
      'Used internally for resolving product details via DataLoader.',
  })
  productId: string;

  @Field(() => ProductModel, {
    nullable: false,
    description:
      'Detailed product information resolved via DataLoader. ' +
      'Always non-null if referential integrity is preserved.',
  })
  product?: ProductModel;
}