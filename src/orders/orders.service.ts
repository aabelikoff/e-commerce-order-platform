import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EOrderStatus,
  Order,
  OrderItem,
  Product,
  User,
} from 'src/database/entities';
import { DataSource, Repository } from 'typeorm';
import { CreateOrderDto } from './v1/dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
  ) {}

  async create(
    dto: CreateOrderDto,
    idempotencyKey: string,
  ): Promise<{ created: boolean; order: Order }> {
    if (!dto.items?.length) {
      throw new BadRequestException('Order items are required');
    }

    const productIds = dto.items.map((i) => i.productId);
    const uniqueIds = [...new Set(productIds)];

    if (uniqueIds.length !== productIds.length) {
      throw new BadRequestException('Duplicate productId in order items');
    }

    // start transaction
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const manager = qr.manager;

      // 0) Check if user exists
      const userExists = await manager.exists(User, {
        where: { id: dto.userId },
      });
      if (!userExists) throw new BadRequestException('User not found');

      //1) Early return if there is an order with such idempotency key stop tx and return found order
      const existing = await manager.findOne(Order, {
        where: { idempotencyKey, user: { id: dto.userId } },
        relations: { items: true },
      });
      if (existing) {
        await qr.rollbackTransaction();
        return {
          order: existing,
          created: false,
        };
      }

      //2) start pessimistick block for product items
      const products: Array<{ id: string; stock: string; price: string }> =
        await manager.query(
          `
          SELECT id, stock, price
          FROM products
          WHERE id = ANY($1::uuid[])
          FOR NO KEY UPDATE
        `,
          [uniqueIds],
        );

      if (products.length !== uniqueIds.length) {
        throw new BadRequestException('Some products not found');
      }

      // mapping products by their ids
      const byId = new Map(products.map((p) => [String(p.id), p]));

      // check existing stock for every product item
      for (const item of dto.items) {
        const p = byId.get(String(item.productId));
        if (!p) throw new BadRequestException('Product not found');
        if (BigInt(p.stock) < BigInt(item.quantity)) {
          throw new ConflictException(
            `Insufficient stock for product ${item.productId}`,
          );
        }
      }

      //3) Create order
      const order = await manager.save(
        manager.create(Order, {
          idempotencyKey,
          status: EOrderStatus.PENDING,
          user: { id: dto.userId } as User,
        }),
      );

      //4) Create items
      const orderItems = dto.items.map((i) => {
        const p = byId.get(String(i.productId));
        if (!p) throw new BadRequestException('Product not found');
        return manager.create(OrderItem, {
          order,
          product: { id: String(i.productId) } as Product,
          quantity: i.quantity.toString(10),
          unitPrice: p.price,
          discountAmount: '0', // TODO:  untill wi don't have any logic for setting discounts neither for items nor for orders
        });
      });
      await manager.save(OrderItem, orderItems);

      //5) updating stock If row was not update - throw error Final guard
      for (const i of dto.items) {
        const rows = await manager.query(
          `
          UPDATE products
          SET stock = stock - $1
          WHERE id = $2 AND stock >= $1
          RETURNING id
          `,
          [i.quantity, i.productId],
        );
        if (rows.length === 0) {
          throw new ConflictException(
            `Insufficient stock for product ${i.productId}`, // 409 as request was valid
          );
        }
      }

      //6) count amount totals fields for Order. JS is not used as it might lead to wrong results
      const [totals] = await manager.query(
        `
        SELECT
          COALESCE(SUM(oi.unit_price * oi.quantity::numeric), 0) AS items_subtotal,
          COALESCE(SUM(oi.discount_amount), 0) AS items_discount_total
        FROM order_items oi
        WHERE oi.order_id = $1
        `,
        [order.id],
      );

      const itemsSubtotal = totals.items_subtotal;
      const itemsDiscountTotal = totals.items_discount_total;
      const shippingAmount = '0'; //  TODO: add functionality
      const orderDiscountAmount = '0'; // TODO: add functionality

      const [calc] = await manager.query(
        `
        SELECT
          ($1::numeric - $2::numeric - $3::numeric + $4::numeric) AS total_amount
        `,
        [
          itemsSubtotal,
          itemsDiscountTotal,
          orderDiscountAmount,
          shippingAmount,
        ],
      );

      // 7) Update Order
      await manager.update(
        Order,
        { id: order.id },
        {
          itemsSubtotal,
          itemsDiscountTotal,
          shippingAmount,
          orderDiscountAmount,
          totalAmount: calc.total_amount,
        },
      );

      await qr.commitTransaction();

      const createdOrder = await this.ordersRepository.findOneOrFail({
        where: { id: order.id },
        relations: { items: true },
      });
      return {
        order: createdOrder,
        created: true,
      };
    } catch (e: any) {
      await qr.rollbackTransaction();
      // 235050 - PSQL Error code for unique violation
      // It is used for case when 2 tx are in race condition
      if (e?.code === '23505') {
        const existing = await this.ordersRepository.findOne({
          where: { idempotencyKey, user: { id: dto.userId } },
          relations: { items: true },
        });
        if (existing) return { order: existing, created: false };
      }

      throw e;
    } finally {
      await qr.release();
    }
  }
}
