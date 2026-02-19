import {
  Entity,
  Column,
  CreateDateColumn,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  RelationId,
} from 'typeorm';
import { User } from './user.entity';
import { OrderItem } from './order-item.entity';
import { Payment } from './payment.entity';

export enum EOrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  SHIPPED = 'shipped',
  CANCELLED = 'cancelled',
}

@Entity({ name: 'orders' })
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: EOrderStatus,
    default: EOrderStatus.PENDING,
  })
  status: EOrderStatus;

  // snapshots
  @Column({
    name: 'items_subtotal',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  itemsSubtotal: string;

  @Column({
    name: 'items_discount_total',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  itemsDiscountTotal: string;

  @Column({
    name: 'shipping_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  shippingAmount: string;

  @Column({
    name: 'order_discount_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  orderDiscountAmount: string;

  @Column({
    name: 'total_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  totalAmount: string;

  @Column({
    name: 'paid_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  paidAmount: string;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @Column({ name: 'idempotency_key', type: 'uuid', unique: true })
  idempotencyKey: string;

  @ManyToOne(() => User, (u) => u.orders, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @RelationId((order: Order) => order.user)
  userId: string;

  @OneToMany(() => OrderItem, (i) => i.order)
  items: OrderItem[];

  @OneToMany(() => Payment, (p) => p.order)
  payments: Payment[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
