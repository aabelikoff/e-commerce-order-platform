import { User, Order, OrderItem, Product } from '../../database/entities';
import { UserModel } from '../models/user.model';
import { ProductModel } from '../models/product.model';
import { OrderItemModel } from '../models/orders/order-item.model';
import { OrderModel } from '../models/orders/order.model';

export class EntityModelMapper {
  static createMapper() {
    const userMapper = (userEntity: User): UserModel => {
      return {
        id: userEntity.id,
        firstName: userEntity.firstName,
        lastName: userEntity.lastName,
        email: userEntity.email,
      };
    };

    const productMapper = (productEntity: Product): ProductModel => {
      return {
        id: productEntity.id,
        name: productEntity.name,
        price: Number(productEntity.price),
        description: productEntity.description,
      };
    };

    const orderItemMapper = (oiEntity: OrderItem): OrderItemModel => {
      return {
        id: oiEntity.id,
        quantity: Number(oiEntity.quantity),
        unitPrice: Number(oiEntity.unitPrice),
        productId: oiEntity.productId,
        product: null as any,
      };
    };

    const orderMapper = (order: Order): OrderModel => {
      return {
        id: order.id,
        status: order.status,
        totalAmount: Number(order.totalAmount),
        createdAt: order.createdAt,
        items: order.items?.map((o) => orderItemMapper(o)),
        userId: order.userId
      };
    };

    return { userMapper, productMapper, orderItemMapper, orderMapper };
  }
}
