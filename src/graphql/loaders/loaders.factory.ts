import DataLoader from 'dataloader';
import { In, Repository } from 'typeorm';
import { Product, User, OrderItem } from 'src/database/entities';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GraphQLLoaders } from './loaders.types';

@Injectable()
export class LoadersFactory {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(OrderItem)
    private readonly itemsRepo: Repository<OrderItem>,
  ) {}

  create(): GraphQLLoaders {
    const productByIdLoader = new DataLoader<string, Product | null>(
      async (ids) => {
        const rows = await this.productsRepo.find({
          where: { id: In([...ids]) },
        });

        const map = new Map<string, Product>(rows.map((p) => [p.id, p]));
        return ids.map((id) => map.get(id) ?? null);
      },
    );

    const userByIdLoader = new DataLoader<string, User | null>(async (ids) => {
      const rows = await this.usersRepo.find({ where: { id: In([...ids]) } });

      const map = new Map<string, User>(rows.map((u) => [u.id, u]));
      return ids.map((id) => map.get(id) ?? null);
    });

    const orderItemByOrderIdLoader = new DataLoader<string, OrderItem[]>(
      async (ids) => {
        const rows = await this.itemsRepo.find({
          where: { orderId: In([...ids]) },
        });
        const map = new Map<string, OrderItem[]>();

        for (const row of rows) {
          const bucket = map.get(row.orderId);
          if (bucket) {
            bucket.push(row);
          } else {
            map.set(row.orderId, [row]);
          }
        }

        return ids.map((id) => map.get(id) ?? []);
      },
    );

    return { productByIdLoader, userByIdLoader, orderItemByOrderIdLoader };
  }
}
