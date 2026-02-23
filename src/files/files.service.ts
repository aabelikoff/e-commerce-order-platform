import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { ERoles } from 'src/auth/access/roles';
import { AuthUser } from 'src/auth/types';
import {
  FileRecord,
  EFileOwnerType,
  EFileStatus,
  EFileVisibility,
} from 'src/database/entities/file-record.entity';
import { Order } from 'src/database/entities/order.entity';
import { Payment } from 'src/database/entities/payment.entity';
import { Product } from 'src/database/entities/product.entity';
import { ProductImage } from 'src/database/entities/product-image.entity';
import { User } from 'src/database/entities/user.entity';
import { EntityManager, Repository } from 'typeorm';
import { PresignFileDto } from './dto/presign-file.dto';
import { S3Service } from './s3.service';
import { CompleteUploadDto } from './dto/complete-upload.dto';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileRecord)
    private readonly filesRepository: Repository<FileRecord>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    private readonly s3Service: S3Service,
  ) {}

  async getFileById(user: AuthUser, id: string) {
    const file = await this.findByIdOrThrow(id);
    this.assertUserOrStaff(file, user);
    return this.toPublicView(file);
  }

  async createPresignedUpload(user: AuthUser, dto: PresignFileDto) {
    await this.assertCanUploadForOwner(user, dto.ownerType, dto.ownerId);
    await this.assertOwnerExists(dto.ownerType, dto.ownerId);

    const key = this.generateObjectKey(
      dto.ownerType,
      dto.ownerId,
      dto.contentType,
    );
    const record = await this.filesRepository.save(
      this.filesRepository.create({
        ownerType: dto.ownerType,
        ownerId: dto.ownerId,
        uploadedByUserId: user.sub,
        bucket: this.s3Service.getBucketName(),
        key,
        mimeType: dto.contentType,
        size: String(dto.sizeBytes),
        status: EFileStatus.PENDING,
        originalName:
          dto.originalName?.trim() || key.split('/').pop() || 'file',
        visibility: dto.visibility ?? EFileVisibility.PRIVATE,
      }),
    );

    let uploadUrl: string;
    try {
      ({ uploadUrl } = await this.s3Service.presignPutObject({
        key,
        contentType: dto.contentType,
        sizeBytes: dto.sizeBytes,
      }));
    } catch (error) {
      await this.filesRepository.delete(record.id);
      throw error;
    }

    return {
      fileId: record.id,
      key: record.key,
      uploadUrl,
      contentType: record.mimeType,
    };
  }

  async completeUpload(user: AuthUser, dto: CompleteUploadDto) {
    return await this.filesRepository.manager.transaction(async (manager) => {
      const fileRepository = manager.getRepository(FileRecord);
      const file = await fileRepository.findOne({
        where: { id: dto.fileId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!file) {
        throw new NotFoundException('File not found');
      }

      this.assertUserOrStaff(file, user);

      if (file.status === EFileStatus.READY) {
        await this.bindFileToDomain(manager, file);
        return this.toPublicView(file);
      }

      if (file.status !== EFileStatus.PENDING) {
        throw new ConflictException(
          `File cannot be completed from status "${file.status}"`,
        );
      }

      const exists = await this.s3Service.objectExists(file.key);
      if (!exists) {
        throw new BadRequestException('File object is missing in storage');
      }

      file.status = EFileStatus.READY;
      const saved = await fileRepository.save(file);
      await this.bindFileToDomain(manager, saved);

      return this.toPublicView(saved);
    });
  }

  private async assertCanUploadForOwner(
    user: AuthUser,
    ownerType: EFileOwnerType,
    ownerId: string,
  ): Promise<void> {
    const isStaff = user.roles?.some(
      (role) => role === ERoles.ADMIN || role === ERoles.SUPPORT,
    );

    if (isStaff) {
      return;
    }

    if (ownerType === EFileOwnerType.USER && ownerId !== user.sub) {
      throw new ForbiddenException(
        'You can upload files only for your own user profile',
      );
    }

    if (ownerType !== EFileOwnerType.USER) {
      throw new ForbiddenException(
        'Only staff can upload files for non-user owners',
      );
    }
  }

  private async assertOwnerExists(
    ownerType: EFileOwnerType,
    ownerId: string,
  ): Promise<void> {
    let exists = false;

    switch (ownerType) {
      case EFileOwnerType.USER:
        exists = await this.usersRepository.exists({ where: { id: ownerId } });
        break;
      case EFileOwnerType.PRODUCT:
        exists = await this.productsRepository.exists({
          where: { id: ownerId },
        });
        break;
      case EFileOwnerType.ORDER:
        exists = await this.ordersRepository.exists({ where: { id: ownerId } });
        break;
      case EFileOwnerType.PAYMENT:
        exists = await this.paymentsRepository.exists({
          where: { id: ownerId },
        });
        break;
      default:
        throw new BadRequestException('Unsupported ownerType');
    }

    if (!exists) {
      throw new NotFoundException(`${ownerType} owner not found`);
    }
  }

  private generateObjectKey(
    ownerType: EFileOwnerType,
    ownerId: string,
    contentType: string,
  ): string {
    const ext = this.extensionFromMime(contentType);
    const id = randomUUID();

    switch (ownerType) {
      case EFileOwnerType.USER:
        return `users/${ownerId}/avatars/${id}.${ext}`;
      case EFileOwnerType.PRODUCT:
        return `products/${ownerId}/images/${id}.${ext}`;
      case EFileOwnerType.ORDER:
        return `orders/${ownerId}/attachments/${id}.${ext}`;
      case EFileOwnerType.PAYMENT:
        return `payments/${ownerId}/attachments/${id}.${ext}`;
      default:
        throw new BadRequestException('Unsupported ownerType');
    }
  }

  private extensionFromMime(contentType: string): string {
    const mime = contentType.toLowerCase();
    const known: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'application/pdf': 'pdf',
      'text/plain': 'txt',
    };

    if (known[mime]) {
      return known[mime];
    }

    const slashIndex = mime.indexOf('/');
    if (slashIndex === -1 || slashIndex === mime.length - 1) {
      throw new BadRequestException('Invalid contentType');
    }

    const rawExt = mime.slice(slashIndex + 1).split(';')[0];
    const normalized = rawExt.replace(/[^a-z0-9.+-]/g, '');
    if (!normalized) {
      throw new BadRequestException('Cannot derive file extension');
    }

    return normalized.includes('+')
      ? normalized.slice(normalized.lastIndexOf('+') + 1)
      : normalized;
  }

  private async findByIdOrThrow(fileId: string): Promise<FileRecord> {
    const file = await this.filesRepository.findOne({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  private toPublicView(file: FileRecord) {
    return {
      id: file.id,
      ownerType: file.ownerType,
      ownerId: file.ownerId,
      status: file.status,
      contentType: file.mimeType,
      sizeBytes: file.size,
      objectKey: file.key,
      bucket: file.bucket,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      publicUrl: this.s3Service.buildPublicUrl(file.key),
    };
  }

  private assertUserOrStaff(file: FileRecord, user: AuthUser): void {
    const isStaff = !!user.roles?.some(
      (role) => role === ERoles.ADMIN || role === ERoles.SUPPORT,
    );

    const isOwner =
      file.ownerType === EFileOwnerType.USER && file.ownerId === user.sub;

    if (!isStaff && !isOwner) {
      throw new ForbiddenException('Not authorized to access this file.');
    }
  }

  private async bindFileToDomain(
    manager: EntityManager,
    file: FileRecord,
  ): Promise<void> {
    switch (file.ownerType) {
      case EFileOwnerType.USER:
        await this.bindUserAvatar(manager, file);
        return;

      case EFileOwnerType.PRODUCT:
        await this.bindProductImage(manager, file);
        return;
      // TODO: add domain binding for these owners
      case EFileOwnerType.ORDER:
      case EFileOwnerType.PAYMENT:
        return;

      default:
        return;
    }
  }

  private async bindUserAvatar(
    manager: EntityManager,
    file: FileRecord,
  ): Promise<void> {
    const result = await manager
      .getRepository(User)
      .update({ id: file.ownerId }, { avatarFileId: file.id });

    if (!result.affected) {
      throw new NotFoundException('User owner not found');
    }
  }

  private async bindProductImage(
    manager: EntityManager,
    file: FileRecord,
  ): Promise<void> {
    const product = await manager.getRepository(Product).findOne({
      where: { id: file.ownerId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const productImagesRepository = manager.getRepository(ProductImage);

    const alreadyLinked = await productImagesRepository.exists({
      where: {
        productId: file.ownerId,
        fileId: file.id,
      },
    });

    if (alreadyLinked) {
      return;
    }

    const existingCount = await productImagesRepository.count({
      where: { productId: file.ownerId },
    });

    const productImage = productImagesRepository.create({
      productId: file.ownerId,
      fileId: file.id,
      sortOrder: existingCount,
      isPrimary: existingCount === 0,
    });

    await productImagesRepository.save(productImage);
  }
}
