import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from 'src/database/entities';
import { OrdersQueryArgs } from '../models/orders/orders-query.args';
import { OrdersPage } from '../models/orders/order.model';
import { OrderMapper } from '../mappers/order.mapper';
import { ResolveField } from '@nestjs/graphql';
import { UserModel } from '../models/user.model';

@Injectable()
export class OrdersQlService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
  ) {}

  async listOrders(args: OrdersQueryArgs): Promise<OrdersPage> {
    const limit = args.pagination?.limit ?? 20;

    const qb = this.ordersRepository
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'oi')
      .leftJoinAndSelect('o.user', 'ou');

    if (args.filter?.status) {
      qb.andWhere('o.status = :status', { status: args.filter.status });
    }
    if (args.filter?.dateFrom) {
      qb.andWhere('o.createdAt >= :dateFrom', {
        dateFrom: args.filter.dateFrom,
      });
    }
    if (args.filter?.dateTo) {
      qb.andWhere('o.createdAt <= :dateTo', { dateTo: args.filter.dateTo });
    }

    qb.orderBy('o.createdAt', 'ASC').addOrderBy('o.id', 'ASC');

    const after = args.pagination?.after;
    if (after) {
      qb.andWhere('(o.createdAt, o.id) > (:afterCreatedAt, :afterId)', {
        afterCreatedAt: after.createdAt,
        afterId: after.id,
      });
    }

    qb.take(limit + 1);

    const rows = (await qb.getMany()).map((o) => OrderMapper.toModel(o));
    const hasNextPage = rows.length > limit;
    const items = hasNextPage ? rows.slice(0, limit) : rows;

    const last = items.at(-1);
    const endCursor = last ? { id: last.id, createdAt: last.createdAt } : null;

    return {
      items,
      pagination: {
        hasNextPage,
        endCursor,
      },
    };
  }

  async findById(id: string) {
    const qb = this.ordersRepository
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'oi')
      .leftJoinAndSelect('oi.product', 'p')
      .leftJoinAndSelect('o.user', 'ou')
      .where('o.id = :id', { id });

    const order = await qb.getOne();
    return order ?? null;
  }

  
}
