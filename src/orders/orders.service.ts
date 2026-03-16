import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  Inject,
  GatewayTimeoutException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EOrderStatus,
  Order,
  OrderItem,
  Product,
  User,
} from '../database/entities';
import { DataSource, Repository } from 'typeorm';
import { CreateOrderDto } from './v1/dto/create-order.dto';
import { AuthUser } from 'src/auth/types';
import { ERoles } from 'src/auth/access/roles';
import { OrdersEventsService } from './orders-events.service';
import { OrdersProcessMessage } from './orders-queue.types';
import { OutboxService } from 'src/outbox/outbox.service';
import { OrderEventEnvelopeV1 } from './orders-kafka-events.types';
import { type ClientGrpc } from '@nestjs/microservices';
import { PAYMENTS_GRPC_CLIENT, PAYMENTS_SERVICE_NAME } from '../common/grpc/grpc.constants';
import {
  AuthorizeResponse,
  PaymentsClient,
} from '../generated/payments/v1/payments';
import { ConfigService } from '@nestjs/config';
import { IPaymentsServiceConfig } from 'src/config/payments-service';
import { lastValueFrom, TimeoutError, timeout } from 'rxjs';

@Injectable()
export class OrdersService implements OnModuleInit {
  private paymentsClient: PaymentsClient;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    private readonly ordersEventsService: OrdersEventsService,
    private readonly outboxService: OutboxService,
    private readonly configService: ConfigService,
    @Inject(PAYMENTS_GRPC_CLIENT)
    private readonly paymentsGrpcClient: ClientGrpc
  ) { }
  
  onModuleInit() {
    this.paymentsClient = this.paymentsGrpcClient.getService<PaymentsClient>(PAYMENTS_SERVICE_NAME)
  }

  async create(
    dto: CreateOrderDto,
    idempotencyKey: string,
  ): Promise<{ created: boolean; order: Order; payment?: AuthorizeResponse }> {
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

      // 8) Insert OutboxEvent

      const message: OrdersProcessMessage = {
        messageId: randomUUID(),
        orderId: order.id,
        createdAt: order.createdAt.toISOString(),
        attempt: 1,
        // simulate: 'alwaysFail'
      };

      await this.outboxService.add(
        'order',
        order.id,
        'order.process_requested',
        message as unknown as Record<string, unknown>,
        manager
      );

      const event: OrderEventEnvelopeV1 = {
        eventId: randomUUID(),
        eventName: 'OrderPlaced',
        occurredAt: order.createdAt.toISOString(),
        schemaVersion: 1,
        order: {
          orderId: order.id,
          userId: dto.userId,
          totalAmount: calc.total_amount,
          currency: 'USD' //TODO: implement different currency options
        }
      }

      await this.outboxService.add(
        'order',
        order.id,
        'order.placed',
        event as unknown as Record<string, unknown>,
        manager
      )

      await qr.commitTransaction();

      const createdOrder = await this.ordersRepository.findOneOrFail({
        where: { id: order.id },
        relations: { items: true },
      });

      const paymentsTimeoutMs =
        this.configService.get<IPaymentsServiceConfig['paymentsGrpcTimeoutMs']>(
          'paymentsServiceConfig.paymentsGrpcTimeoutMs',
        ) ?? 2500;

      const payment = await lastValueFrom(
        this.paymentsClient
          .authorize({
            orderId: order.id,
            userId: dto.userId,
            total: {
              amount: calc.total_amount,
              currency: 'USD',
            },
            idempotencyKey,
          })
          .pipe(timeout(paymentsTimeoutMs)),
      );

      return {
        order: createdOrder,
        created: true,
        payment,
      };
    } catch (e: unknown) {
      if (e instanceof TimeoutError) {
        throw new GatewayTimeoutException('Payments service timeout');
      }
      if ((e as { code?: number })?.code !== undefined) {
        throw new ServiceUnavailableException('Payments service unavailable');
      }
      if (qr.isTransactionActive) {
        await qr.rollbackTransaction();
      }
      // 235050 - PSQL Error code for unique violation
      // It is used for case when 2 tx are in race condition
      if ((e as { code?: string })?.code === '23505') {
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

  // TODO: add pagination, filters, sorting, etc. For now it just returns all orders for user or all orders if user is staff
  async findAll(user: AuthUser): Promise<Order[]> {
    const isStaff = this.isStaff(user.roles);

    const query = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoin('order.user', 'user')
      // .leftJoinAndSelect('order.items', 'items')
      // .leftJoinAndSelect('order.payments', 'payments')
      // .leftJoinAndSelect('order.user', 'user')
      .orderBy('order.createdAt', 'DESC')
      .addOrderBy('order.id', 'DESC');

    if (!isStaff) {
      query.where('user.id = :userId', { userId: user.sub });
    }

    return await query.getMany();
  }

  async findOne(user: AuthUser, id: string): Promise<Order> {
    const isStaff = this.isStaff(user.roles);

    const query = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoin('order.user', 'user')
      .where('order.id = :id', { id });

    if (!isStaff) {
      query.andWhere('user.id = :userId', { userId: user.sub });
    }

    const order = await query.getOne();

    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async delete(id: string): Promise<void> {
    const result = await this.ordersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Order not found');
    }
  }

  private isStaff(roles: string[]): boolean {
    return roles?.some((r) => r === ERoles.ADMIN || r === ERoles.SUPPORT);
  }

  async updateStatus(
    orderId: string,
    status: EOrderStatus,
    user: AuthUser,
  ): Promise<Order> {
    if (!this.isStaff(user.roles)) {
      throw new ForbiddenException(`Only staff can change order status`);
    }

    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.status === status) {
      return order;
    }
    const fromStatus = order.status;

    order.status = status;
    order.statusVersion = (order.statusVersion ?? 0) + 1;
    const saved = await this.ordersRepository.save(order);

    this.ordersEventsService.publishStatusChanged({
      type: 'order.status_changed',
      orderId: saved.id,
      version: saved.statusVersion,
      fromStatus,
      toStatus: status,
      changedAt: saved.updatedAt.toISOString(),
    });

    return saved;
  }

  async canSubscribeToOrder(orderId: string, user: AuthUser): Promise<void> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    this.assertCanAccessOrder(order, user);
  }

  private assertCanAccessOrder(order: Order, user: AuthUser): void {
    if (this.isStaff(user.roles)) {
      return;
    }

    if (order.userId !== user.sub) {
      throw new ForbiddenException('Access denied');
    }
  }
}
