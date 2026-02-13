import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../database/entities';
import { OrdersFilterInput } from '../models/orders/orders-filter.input';
import { PaginationCursorInput } from '../models/common/pagination-cursor.input';
import { OrdersConnection } from '../models/orders/orders-connection.model';
import { decodeCursor, encodeCursor } from '../utils/cursor-string.util';

@Injectable()
export class OrdersService {

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

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

    if (cursor) {
      const { id, createdAt } = decodeCursor(cursor);
      query.andWhere(
        '(order.createdAt < :createdAt OR (order.createdAt = :createdAt AND order.id < :id))',
        { createdAt, id },
      );
    }

    const orders = await query.getMany();

    const hasNextPage = orders.length > limit;
    if (hasNextPage) {
      orders.pop();
    }

    const endCursor =
      orders.length > 0
        ? encodeCursor(
            orders[orders.length - 1].id,
            orders[orders.length - 1].createdAt,
          )
        : null;

    const totalCount = await this.orderRepo.count({
      where: filter?.status ? { status: filter.status } : {},
    });

    return {
      nodes: orders.map((o) => {
        return {
          id: o.id,
          status: o.status,
          createdAt: o.createdAt,
          totalAmount: Number(o.totalAmount),
          userId: o.userId,
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
