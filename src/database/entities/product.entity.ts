import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { OrderItem } from './order-item.entity';
import { ProductImage } from './product-image.entity';

@Entity({ name: 'products' })
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'price', type: 'numeric', precision: 12, scale: 2 })
  price: string;

  @Column({ name: 'description', type: 'text' })
  description: string;

  @Column({ name: 'stock', type: 'bigint' })
  stock: string;

  @OneToMany(() => OrderItem, (i) => i.product)
  items: OrderItem[];

  @OneToMany(() => ProductImage, (img) => img.product)
  images: ProductImage[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
