import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order, FileRecord } from './index';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Column({ name: 'email', length: 254, unique: true, nullable: false })
  email: string;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
    select: false,
  })
  passwordHash: string;

  @Column({
    type: 'text',
    array: true,
    default: () => 'ARRAY[]::text[]',
  })
  roles: string[];

  @Column({
    type: 'text',
    array: true,
    default: () => 'ARRAY[]::text[]',
  })
  scopes: string[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => Order, (o) => o.user)
  orders: Order[];

  @ManyToOne(() => FileRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'avatar_file_id' })
  avatarFile?: FileRecord | null;

  @Column({ name: 'avatar_file_id', type: 'uuid', nullable: true })
  avatarFileId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
