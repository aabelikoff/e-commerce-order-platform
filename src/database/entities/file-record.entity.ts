import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum EFileStatus {
  PENDING = 'pending',
  READY = 'ready',
  FAILED = 'failed',
}

export enum EFileVisibility {
  PRIVATE = 'private',
  PUBLIC = 'public',
}

export enum EFileOwnerType {
  USER = 'user',
  ORDER = 'order',
  PRODUCT = 'product',
  PAYMENT = 'payment',
}

@Entity({ name: 'files' })
@Index('IDX_files_owner', ['ownerType', 'ownerId'])
@Index('IDX_files_uploaded_by_user_id', ['uploadedByUserId'])
@Index('IDX_files_status', ['status'])
@Index('UQ_files_object_key', ['bucket', 'key'], { unique: true })
export class FileRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: EFileOwnerType, name: 'owner_type' })
  ownerType: EFileOwnerType;

  @Column({ type: 'uuid', name: 'owner_id' })
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploadedByUser: User | null;

  @Column({ type: 'uuid', name: 'uploaded_by_user_id', nullable: true })
  uploadedByUserId: string | null;

  @Column({ type: 'text' })
  bucket: string;

  @Column({ type: 'text' })
  key: string;

  @Column({ type: 'text', name: 'mime_type' })
  mimeType: string;

  @Column({ type: 'bigint' })
  size: string;

  @Column({ type: 'enum', enum: EFileStatus, default: EFileStatus.PENDING })
  status: EFileStatus;

  @Column({ type: 'text', name: 'original_name' })
  originalName: string;

  @Column({ type: 'text', nullable: true })
  checksum?: string | null;

  @Column({
    type: 'enum',
    enum: EFileVisibility,
    default: EFileVisibility.PRIVATE,
  })
  visibility: EFileVisibility;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt?: Date | null;
}
