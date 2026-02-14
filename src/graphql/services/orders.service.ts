import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../database/entities';
import { OrdersFilterInput } from '../models/orders/orders-filter.input';
import { OrderModel } from '../models/orders/order.model';
import { PaginationCursorInput } from '../models/common/pagination-cursor.input';
import { OrdersConnection } from '../models/orders/orders-connection.model';
import { decodeCursor, encodeCursor } from '../utils/cursor-string.util';
import { EntityModelMapper } from '../utils/entity-modes.mapper';

@Injectable()
export class OrdersService {
  private readonly mapper = EntityModelMapper.createMapper();
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) { }
  
  async findOrder(id: string): Promise<OrderModel> {
    const order = await this.orderRepo.findOne({
      where: { id },
    });
    if (!order) throw new Error(`Order not found: ${id}`);
    return { ...this.mapper.orderMapper(order), items: [] };
  }

  async findOrders(
    filter?: OrdersFilterInput,
    pagination?: PaginationCursorInput,
  ): Promise<OrdersConnection> {
    const limit = pagination?.limit || 20;
    const cursor = pagination?.cursor;

    const query = this.orderRepo
      .createQueryBuilder('order')
      .leftJoin('order.user', 'user')
      .addSelect('user.id', 'userId')
      .orderBy('order.createdAt', 'DESC')
      .addOrderBy('order.id', 'DESC')
      .take(limit + 1);

    if (filter?.status) {
      query.andWhere('order.status = :status', { status: filter.status });
    }

    if (filter?.dateFrom) {
      query.andWhere('order.createdAt >= :dateFrom', {
        dateFrom: filter.dateFrom,
      });
    }
    if (filter?.dateTo) {
      query.andWhere('order.createdAt <= :dateTo', { dateTo: filter.dateTo });
    }

    const totalCount = await query.clone().getCount();

    if (cursor) {
      const { id, createdAt } = decodeCursor(cursor);
      query.andWhere(
        '(order.createdAt < :createdAt OR (order.createdAt = :createdAt AND order.id < :id))',
        { createdAt, id },
      );
    }

    // const orders = await query.getMany();
    const { entities: orders, raw } = await query.getRawAndEntities();

    const hasNextPage = orders.length > limit;
    if (hasNextPage) {
      orders.pop();
      raw.pop();
    }

    const endCursor =
      orders.length > 0
        ? encodeCursor(
            orders[orders.length - 1].id,
            orders[orders.length - 1].createdAt,
          )
        : null;

    return {
      nodes: orders.map((o, i) => {
        return {
          id: o.id,
          status: o.status,
          createdAt: o.createdAt,
          totalAmount: Number(o.totalAmount),
          userId: raw[i].userId,
          items: [],
        };
      }),
      pageInfo: {
        hasNextPage,
        endCursor,
      },
      totalCount,
    };
  }
}
