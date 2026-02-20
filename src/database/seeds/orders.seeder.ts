import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import {
  Order,
  OrderItem,
  Product,
  User,
  Payment,
  EOrderStatus,
  EPaymentStatus,
} from '../entities';

type SeedOrderItem = {
  productName: string;
  quantity: string;
  unitPrice: string;
  discountAmount?: string;
};

type SeedPayment = {
  status: EPaymentStatus;
  paidAt: Date | null;
  paidAmount: string;
};

type SeedOrder = {
  idempotencyKey: string;
  userEmail: string;
  status: EOrderStatus;
  itemsSubtotal: string;
  itemsDiscountTotal: string;
  shippingAmount: string;
  orderDiscountAmount: string;
  totalAmount: string;
  paidAmount: string;
  paidAt: Date | null;
  items: SeedOrderItem[];
  payment: SeedPayment;
};

export default class OrdersSeed implements Seeder {
  public async run(dataSource: DataSource) {
    const usersRepo = dataSource.getRepository(User);
    const productsRepo = dataSource.getRepository(Product);
    const ordersRepo = dataSource.getRepository(Order);
    const orderItemsRepo = dataSource.getRepository(OrderItem);
    const paymentsRepo = dataSource.getRepository(Payment);

    console.log('OrdersSeed started...');

    const users = await usersRepo.find({
      where: seedOrders.map((o) => ({ email: o.userEmail })),
    });
    const userByEmail = new Map(users.map((u) => [u.email, u]));

    const productNames = [
      ...new Set(seedOrders.flatMap((o) => o.items.map((i) => i.productName))),
    ];
    const products = await productsRepo.find({
      where: productNames.map((name) => ({ name })),
    });
    const productByName = new Map(products.map((p) => [p.name, p]));

    for (const seedOrder of seedOrders) {
      const existing = await ordersRepo.findOne({
        where: { idempotencyKey: seedOrder.idempotencyKey },
      });
      if (existing) continue;

      const user = userByEmail.get(seedOrder.userEmail);
      if (!user) {
        throw new Error(`OrdersSeed: user not found: ${seedOrder.userEmail}`);
      }

      const order = await ordersRepo.save(
        ordersRepo.create({
          idempotencyKey: seedOrder.idempotencyKey,
          user,
          status: seedOrder.status,
          itemsSubtotal: seedOrder.itemsSubtotal,
          itemsDiscountTotal: seedOrder.itemsDiscountTotal,
          shippingAmount: seedOrder.shippingAmount,
          orderDiscountAmount: seedOrder.orderDiscountAmount,
          totalAmount: seedOrder.totalAmount,
          paidAmount: seedOrder.paidAmount,
          paidAt: seedOrder.paidAt,
        }),
      );

      const items = seedOrder.items.map((item) => {
        const product = productByName.get(item.productName);
        if (!product) {
          throw new Error(`OrdersSeed: product not found: ${item.productName}`);
        }

        return orderItemsRepo.create({
          order,
          product,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount ?? '0',
        });
      });

      await orderItemsRepo.save(items);

      // ✅ payment seed (1 payment per order for demo)
      const paymentAlreadyExists = await paymentsRepo.findOne({
        where: { orderId: order.id },
        select: { id: true },
      });

      if (!paymentAlreadyExists) {
        await paymentsRepo.save(
          paymentsRepo.create({
            order, // достаточно, orderId проставится через JoinColumn
            status: seedOrder.payment.status,
            paidAt: seedOrder.payment.paidAt,
            paidAmount: seedOrder.payment.paidAmount,
          }),
        );
      }
    }

    console.log('OrdersSeed done');
  }
}

const seedOrders: SeedOrder[] = [
  {
    idempotencyKey: '11111111-1111-4111-8111-111111111111',
    userEmail: 'alice@example.com',
    status: EOrderStatus.PAID,
    itemsSubtotal: '129.98',
    itemsDiscountTotal: '10.00',
    shippingAmount: '5.00',
    orderDiscountAmount: '0.00',
    totalAmount: '124.98',
    paidAmount: '124.98',
    paidAt: new Date('2026-02-01T10:00:00.000Z'),
    items: [
      {
        productName: 'Wireless Bluetooth Headphones',
        quantity: '1',
        unitPrice: '79.99',
        discountAmount: '10.00',
      },
      {
        productName: 'Ergonomic Gaming Mouse',
        quantity: '1',
        unitPrice: '49.99',
      },
    ],
    payment: {
      status: EPaymentStatus.PAID,
      paidAt: new Date('2026-02-01T10:00:00.000Z'),
      paidAmount: '124.98',
    },
  },
  {
    idempotencyKey: '22222222-2222-4222-8222-222222222222',
    userEmail: 'bob@example.com',
    status: EOrderStatus.PENDING,
    itemsSubtotal: '154.98',
    itemsDiscountTotal: '0.00',
    shippingAmount: '0.00',
    orderDiscountAmount: '0.00',
    totalAmount: '154.98',
    paidAmount: '0.00',
    paidAt: null,
    items: [
      {
        productName: 'Portable Phone Charger 20000mAh',
        quantity: '1',
        unitPrice: '34.99',
      },
      {
        productName: 'Mechanical Keyboard RGB',
        quantity: '1',
        unitPrice: '129.99',
        discountAmount: '10.00',
      },
    ],
    payment: {
      status: EPaymentStatus.UNPAID,
      paidAt: null,
      paidAmount: '0.00',
    },
  },
  {
    idempotencyKey: '33333333-3333-4333-8333-333333333333',
    userEmail: 'admin@example.com',
    status: EOrderStatus.SHIPPED,
    itemsSubtotal: '74.97',
    itemsDiscountTotal: '0.00',
    shippingAmount: '7.50',
    orderDiscountAmount: '2.50',
    totalAmount: '79.97',
    paidAmount: '79.97',
    paidAt: new Date('2026-02-03T12:30:00.000Z'),
    items: [
      {
        productName: 'Stainless Steel Water Bottle',
        quantity: '3',
        unitPrice: '24.99',
      },
    ],
    payment: {
      status: EPaymentStatus.PAID,
      paidAt: new Date('2026-02-03T12:30:00.000Z'),
      paidAmount: '79.97',
    },
  },
];