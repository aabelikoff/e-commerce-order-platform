import { ObjectType, Field, ID, Float } from '@nestjs/graphql';

@ObjectType({ description: 'Represents a product available for purchase' })
export class ProductModel {
  @Field(() => ID, {
    description: 'Unique identifier of the product (UUID)',
  })
  id: string;

  @Field(() => String, {
    description: 'Product name displayed to customers',
  })
  name: string;

  @Field(() => Float, {
    description: 'Current product price(snapshot) in system currency',
  })
  price: number;

  @Field(() => String, {
    nullable: true,
    description: 'Detailed product description',
  })
  description?: string;
}
