import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import DataLoader from 'dataloader';
import { In, Repository } from 'typeorm';
import { User, Product, OrderItem, Payment } from '../../database/entities';
import { AppLoaders } from './loaders.types';

@Injectable()
export class LoadersFactory {
  private readonly logger = new Logger(LoadersFactory.name);
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    @InjectRepository(OrderItem)
    private orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
  ) {}

  create(): AppLoaders {
    this.logger.log('LoadersFactory.create() called');
    return {
      userByIdLoader: new DataLoader<string, User | null>(
        async (ids: string[]) => {
          if (ids.length === 0) return [];

          const users = await this.usersRepository.find({
            where: { id: In([...ids]) },
          });
          const usersById = new Map(users.map((u) => [u.id, u]));
          return [...ids].map((id) => usersById.get(id) ?? null);
        },
      ),

      productByIdLoader: new DataLoader<string, Product | null>(
        async (ids: string[]) => {
          if (ids.length === 0) return [];

          const products = await this.productsRepository.find({
            where: { id: In([...ids]) },
          });
          const productsById = new Map(products.map((p) => [p.id, p]));
          return [...ids].map((id) => productsById.get(id) ?? null);
        },
      ),

      orderItemsByOrderIdLoader: new DataLoader<string, OrderItem[]>(
        async (orderIds: string[]) => {
          if (orderIds.length === 0) return [];

          const orderItems = await this.orderItemsRepository.find({
              where: { order: { id: In(orderIds) } },
              relations: {order: true}
          });

          const orderItemsByOrderId = new Map(
            orderIds.map((orderId) => [orderId, [] as OrderItem[]]),
          );

          for (const orderItem of orderItems) {
            const oid = (orderItem as any).orderId ?? orderItem.order?.id;
            if (oid) orderItemsByOrderId.get(oid)?.push(orderItem);
          }

          return orderIds.map((oi) => orderItemsByOrderId.get(oi) ?? []);
        },
      ),

      paymentsByOrderIdLoader: new DataLoader<string, Payment[]>(
        async (orderIds: string[]): Promise<Payment[][]> => {
          if (orderIds.length === 0) return [];

          const payments = await this.paymentsRepository.find({
            where: { orderId: In(orderIds) },
          });

          const paymentsByOrderId = new Map(
            orderIds.map((orderId) => [orderId, [] as Payment[]]),
          );

          for (const payment of payments) {
            const oid = payment.orderId;
            if (oid) paymentsByOrderId.get(oid)?.push(payment);
          }

          return orderIds.map((oid) => paymentsByOrderId.get(oid) ?? []);
        }
      )
    };
  }
}
