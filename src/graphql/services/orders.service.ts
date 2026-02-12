// src/orders/orders.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../database/entities';
import { OrdersFilterInput } from '../models/orders/orders-filter.input';
import { PaginationCursorInput } from '../models/common/pagination-cursor.input';
import { OrdersConnection } from '../models/orders/orders-connection.model';
import { decodeCursor, encodeCursor } from '../utils/cursor-string.util';
import { EntityModelMapper } from '../utils/entitie-modes.mapper';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

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

    this.logger.log(
      `🔍 Finding orders with limit: ${limit}, cursor: ${cursor}`,
    );

    const query = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items') // загружаем items
      .orderBy('order.createdAt', 'DESC')
      .addOrderBy('order.id', 'DESC')
      .take(limit + 1);

    // Фильтр по статусу
    if (filter?.status) {
      query.andWhere('order.status = :status', { status: filter.status });
    }

    // Фильтр по датам
    if (filter?.dateFrom) {
      query.andWhere('order.createdAt >= :dateFrom', {
        dateFrom: filter.dateFrom,
      });
    }
    if (filter?.dateTo) {
      query.andWhere('order.createdAt <= :dateTo', { dateTo: filter.dateTo });
    }

    // Курсор пагинация
    if (cursor) {
      const { id, createdAt } = decodeCursor(cursor);
      query.andWhere(
        '(order.createdAt < :createdAt OR (order.createdAt = :createdAt AND order.id < :id))',
        { createdAt, id },
      );
    }

    const orders = await query.getMany();

    this.logger.log(`✅ Found ${orders.length} orders`);

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

    // Для totalCount делаем отдельный запрос
    const totalCount = await this.orderRepo.count({
      where: filter?.status ? { status: filter.status } : {},
    });

    return {
      nodes: orders.map((o) =>
        EntityModelMapper.createMapper().orderMapper(o),
      ),
      pageInfo: {
        hasNextPage,
        endCursor,
      },
      totalCount,
    };
  }
}
