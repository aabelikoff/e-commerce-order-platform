import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import DataLoader from 'dataloader';
import { In, Repository } from 'typeorm';
import { User, Product, OrderItem } from '../../database/entities';
import { AppLoaders } from './loaders.types';
import { App } from 'supertest/types';

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
          });

          const orderItemsByOrderId = new Map(
            orderIds.map((orderId) => [orderId, [] as OrderItem[]]),
          );

          for (const orderItem of orderItems) {
            orderItemsByOrderId.get(orderItem.orderId)?.push(orderItem);
          }

          return orderIds.map((oi) => orderItemsByOrderId.get(oi) ?? []);
        },
      ),
    };
  }
}
