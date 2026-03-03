import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { Order } from './order.entity';

@Entity({ name: 'processed_messages' })
export class ProcessedMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'message_id', type: 'uuid', unique: true })
  messageId: string;

  @Column({
    name: 'processed_at',
    type: 'timestamptz',
    nullable: true,
    default: () => 'now()',
  })
  processedAt: Date | null;

  @ManyToOne(() => Order, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @RelationId((pm: ProcessedMessage) => pm.order)
  orderId: string;

  @Column({ name: 'handler', type: 'varchar', nullable: true })
  handler: string;
}
