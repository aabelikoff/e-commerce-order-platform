import { Resolver, ResolveField, Parent, Context } from '@nestjs/graphql';
import { OrderItemModel } from '../models/orders/order-item.model';
import { ProductModel } from '../models/product.model';
import type { GraphQLContext } from '../loaders/loaders.types';

@Resolver(() => OrderItemModel)
export class OrderItemResolver {
  @ResolveField(() => ProductModel)
  async product(
    @Parent() item: OrderItemModel,
    @Context() ctx: GraphQLContext,
  ): Promise<ProductModel> {
    const product = await ctx.loaders.productByIdLoader.load(item.productId);
    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }

    return product;
  }
}
