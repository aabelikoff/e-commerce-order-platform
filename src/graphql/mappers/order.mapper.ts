import { Order } from '../../database/entities';
import { OrderModel } from '../models/orders/order.model';
import { OrderItemModel } from '../models/orders/order-item.model';
import { UserModel } from '../models/user.model';

export class OrderMapper {
  static toModel(entity: Order): OrderModel {
    return {
      id: entity.id,
      status: entity.status,
      itemsSubtotal: entity.itemsSubtotal,
      itemsDiscountTotal: entity.itemsDiscountTotal,
      shippingAmount: entity.shippingAmount,
      orderDiscountAmount: entity.orderDiscountAmount,
      totalAmount: entity.totalAmount,
      paidAmount: entity.paidAmount,
      createdAt: entity.createdAt,

      user: OrderMapper.mapUser(entity),

      items: entity.items?.map(OrderMapper.mapItem) ?? [],
    };
  }

  private static mapUser(order: Order): UserModel {
    return {
      id: order.user.id,
      firstName: order.user.firstName,
      lastName: order.user.lastName,
      isActive: order.user.isActive,
    };
  }

  private static mapItem(item: any): OrderItemModel {
    return {
      id: item.id,
      quantity: Number(item.quantity),
      discountAmount: item.discountAmount,
      productId: item.productId,
      product: undefined as any,
      // product будем резолвить через DataLoader
    };
  }
}
