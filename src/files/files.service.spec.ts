import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ERoles } from 'src/auth/access/roles';
import { AuthUser } from 'src/auth/types';
import { Order } from 'src/database/entities/order.entity';
import { Payment } from 'src/database/entities/payment.entity';
import { ProductImage } from 'src/database/entities/product-image.entity';
import { Product } from 'src/database/entities/product.entity';
import { User } from 'src/database/entities/user.entity';
import {
  EFileOwnerType,
  EFileStatus,
  EFileVisibility,
  FileRecord,
} from 'src/database/entities/file-record.entity';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { PresignFileDto } from './dto/presign-file.dto';
import { FilesService } from './files.service';
import { S3Service } from './s3.service';

describe('FilesService', () => {
  let service: FilesService;

  const ownerUser: AuthUser = {
    sub: 'user-1',
    email: 'owner@example.com',
    roles: [ERoles.USER],
    scopes: [],
  };

  const otherUser: AuthUser = {
    sub: 'user-2',
    email: 'other@example.com',
    roles: [ERoles.USER],
    scopes: [],
  };

  const adminUser: AuthUser = {
    sub: 'admin-1',
    email: 'admin@example.com',
    roles: [ERoles.ADMIN],
    scopes: [],
  };

  const baseFile = (): FileRecord =>
    ({
      id: 'file-1',
      ownerType: EFileOwnerType.USER,
      ownerId: 'user-1',
      uploadedByUserId: 'user-1',
      bucket: 'test-bucket',
      key: 'users/user-1/avatars/avatar.jpg',
      mimeType: 'image/jpeg',
      size: '123',
      status: EFileStatus.PENDING,
      originalName: 'avatar.jpg',
      visibility: EFileVisibility.PRIVATE,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    }) as FileRecord;

  const mockFilesRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    manager: {
      transaction: jest.fn(),
    },
  };

  const mockUsersRepository = {
    exists: jest.fn(),
  };

  const mockProductsRepository = {
    exists: jest.fn(),
  };

  const mockOrdersRepository = {
    exists: jest.fn(),
  };

  const mockPaymentsRepository = {
    exists: jest.fn(),
  };

  const mockS3Service = {
    getBucketName: jest.fn(),
    presignPutObject: jest.fn(),
    objectExists: jest.fn(),
    buildPublicUrl: jest.fn(),
  };

  const mockTransactionalFilesRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockTransactionalUsersRepository = {
    update: jest.fn(),
  };

  const mockTransactionalProductsRepository = {
    findOne: jest.fn(),
  };

  const mockTransactionalProductImagesRepository = {
    exists: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const transactionManager = {
    getRepository: jest.fn(),
  };

  const completeDto: CompleteUploadDto = {
    fileId: 'file-1',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockFilesRepository.manager.transaction.mockImplementation(
      async (
        callback: (manager: typeof transactionManager) => Promise<unknown>,
      ) => callback(transactionManager),
    );

    transactionManager.getRepository.mockImplementation((entity: unknown) => {
      if (entity === FileRecord) return mockTransactionalFilesRepository;
      if (entity === User) return mockTransactionalUsersRepository;
      if (entity === Product) return mockTransactionalProductsRepository;
      if (entity === ProductImage)
        return mockTransactionalProductImagesRepository;
      throw new Error(`Unexpected repository token: ${String(entity)}`);
    });

    mockS3Service.getBucketName.mockReturnValue('test-bucket');
    mockS3Service.buildPublicUrl.mockImplementation(
      (key: string) => `https://cdn.example.com/${key}`,
    );
    mockFilesRepository.create.mockImplementation(
      (payload: Record<string, unknown>) => payload,
    );
    mockTransactionalProductImagesRepository.create.mockImplementation(
      (payload: Record<string, unknown>) => payload,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        {
          provide: getRepositoryToken(FileRecord),
          useValue: mockFilesRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductsRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrdersRepository,
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentsRepository,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns a public file view for the owner', async () => {
    const file = baseFile();
    mockFilesRepository.findOne.mockResolvedValue(file);

    const result = await service.getFileById(ownerUser, file.id);

    expect(mockFilesRepository.findOne).toHaveBeenCalledWith({
      where: { id: file.id },
    });
    expect(mockS3Service.buildPublicUrl).toHaveBeenCalledWith(file.key);
    expect(result).toEqual({
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
      publicUrl: `https://cdn.example.com/${file.key}`,
    });
  });

  it('allows staff to read another users file', async () => {
    const file = baseFile();
    mockFilesRepository.findOne.mockResolvedValue(file);

    await expect(service.getFileById(adminUser, file.id)).resolves.toEqual(
      expect.objectContaining({ id: file.id }),
    );
  });

  it('throws NotFoundException when file is missing', async () => {
    mockFilesRepository.findOne.mockResolvedValue(null);

    await expect(
      service.getFileById(ownerUser, 'missing-file'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when non-owner tries to read a private file', async () => {
    mockFilesRepository.findOne.mockResolvedValue(baseFile());

    await expect(service.getFileById(otherUser, 'file-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('creates a presigned upload for the owner profile', async () => {
    const dto: PresignFileDto = {
      ownerType: EFileOwnerType.USER,
      ownerId: ownerUser.sub,
      contentType: 'image/png',
      sizeBytes: 456,
      originalName: ' avatar.png ',
    };

    mockUsersRepository.exists.mockResolvedValue(true);
    mockFilesRepository.save.mockImplementation(async (record) => ({
      id: 'file-123',
      ...record,
    }));
    mockS3Service.presignPutObject.mockResolvedValue({
      uploadUrl: 'https://upload.example.com/file-123',
      expiresInSec: 900,
    });

    const result = await service.createPresignedUpload(ownerUser, dto);

    expect(mockUsersRepository.exists).toHaveBeenCalledWith({
      where: { id: ownerUser.sub },
    });
    expect(mockFilesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerType: EFileOwnerType.USER,
        ownerId: ownerUser.sub,
        uploadedByUserId: ownerUser.sub,
        bucket: 'test-bucket',
        mimeType: 'image/png',
        size: '456',
        status: EFileStatus.PENDING,
        originalName: 'avatar.png',
        visibility: EFileVisibility.PRIVATE,
        key: expect.stringMatching(
          /^users\/user-1\/avatars\/.+\.png$/,
        ) as unknown as string,
      }),
    );
    expect(mockS3Service.presignPutObject).toHaveBeenCalledWith({
      key: expect.stringMatching(/^users\/user-1\/avatars\/.+\.png$/),
      contentType: 'image/png',
      sizeBytes: 456,
    });
    expect(result).toEqual({
      fileId: 'file-123',
      key: expect.stringMatching(/^users\/user-1\/avatars\/.+\.png$/),
      uploadUrl: 'https://upload.example.com/file-123',
      contentType: 'image/png',
    });
  });

  it('allows staff to create uploads for product owners', async () => {
    const dto: PresignFileDto = {
      ownerType: EFileOwnerType.PRODUCT,
      ownerId: 'product-1',
      contentType: 'image/webp',
      sizeBytes: 512,
      visibility: EFileVisibility.PUBLIC,
    };

    mockProductsRepository.exists.mockResolvedValue(true);
    mockFilesRepository.save.mockImplementation(async (record) => ({
      id: 'file-product-1',
      ...record,
    }));
    mockS3Service.presignPutObject.mockResolvedValue({
      uploadUrl: 'https://upload.example.com/product-1',
      expiresInSec: 900,
    });

    const result = await service.createPresignedUpload(adminUser, dto);

    expect(mockProductsRepository.exists).toHaveBeenCalledWith({
      where: { id: 'product-1' },
    });
    expect(mockFilesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerType: EFileOwnerType.PRODUCT,
        ownerId: 'product-1',
        uploadedByUserId: adminUser.sub,
        visibility: EFileVisibility.PUBLIC,
        originalName: expect.stringMatching(/^.+\.webp$/) as unknown as string,
      }),
    );
    expect(result).toEqual({
      fileId: 'file-product-1',
      key: expect.stringMatching(/^products\/product-1\/images\/.+\.webp$/),
      uploadUrl: 'https://upload.example.com/product-1',
      contentType: 'image/webp',
    });
  });

  it('throws ForbiddenException when regular user uploads for another profile', async () => {
    const dto: PresignFileDto = {
      ownerType: EFileOwnerType.USER,
      ownerId: 'user-999',
      contentType: 'image/jpeg',
      sizeBytes: 10,
    };

    await expect(service.createPresignedUpload(ownerUser, dto)).rejects.toThrow(
      ForbiddenException,
    );

    expect(mockUsersRepository.exists).not.toHaveBeenCalled();
    expect(mockFilesRepository.save).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when regular user uploads for non-user owner', async () => {
    const dto: PresignFileDto = {
      ownerType: EFileOwnerType.ORDER,
      ownerId: 'order-1',
      contentType: 'application/pdf',
      sizeBytes: 1024,
    };

    await expect(service.createPresignedUpload(ownerUser, dto)).rejects.toThrow(
      ForbiddenException,
    );

    expect(mockOrdersRepository.exists).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when owner does not exist', async () => {
    const dto: PresignFileDto = {
      ownerType: EFileOwnerType.USER,
      ownerId: ownerUser.sub,
      contentType: 'image/png',
      sizeBytes: 456,
    };

    mockUsersRepository.exists.mockResolvedValue(false);

    await expect(service.createPresignedUpload(ownerUser, dto)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('deletes the saved record when presign generation fails', async () => {
    const dto: PresignFileDto = {
      ownerType: EFileOwnerType.USER,
      ownerId: ownerUser.sub,
      contentType: 'image/png',
      sizeBytes: 456,
    };

    mockUsersRepository.exists.mockResolvedValue(true);
    mockFilesRepository.save.mockImplementation(async (record) => ({
      id: 'file-delete-me',
      ...record,
    }));
    mockS3Service.presignPutObject.mockRejectedValue(new Error('S3 down'));

    await expect(service.createPresignedUpload(ownerUser, dto)).rejects.toThrow(
      'S3 down',
    );

    expect(mockFilesRepository.delete).toHaveBeenCalledWith('file-delete-me');
  });

  it('throws BadRequestException for invalid content types without extension', async () => {
    const dto: PresignFileDto = {
      ownerType: EFileOwnerType.USER,
      ownerId: ownerUser.sub,
      contentType: 'invalidtype',
      sizeBytes: 1,
    };

    mockUsersRepository.exists.mockResolvedValue(true);

    await expect(service.createPresignedUpload(ownerUser, dto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws NotFoundException when completeUpload cannot find the file', async () => {
    mockTransactionalFilesRepository.findOne.mockResolvedValue(null);

    await expect(
      service.completeUpload(ownerUser, completeDto),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when completing another users file', async () => {
    mockTransactionalFilesRepository.findOne.mockResolvedValue(baseFile());

    await expect(
      service.completeUpload(otherUser, completeDto),
    ).rejects.toThrow(ForbiddenException);
  });

  it('returns public view for already ready file and binds avatar', async () => {
    const file = {
      ...baseFile(),
      status: EFileStatus.READY,
    };
    mockTransactionalFilesRepository.findOne.mockResolvedValue(file);
    mockTransactionalUsersRepository.update.mockResolvedValue({ affected: 1 });

    const result = await service.completeUpload(ownerUser, completeDto);

    expect(mockTransactionalUsersRepository.update).toHaveBeenCalledWith(
      { id: file.ownerId },
      { avatarFileId: file.id },
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: file.id,
        status: EFileStatus.READY,
        publicUrl: `https://cdn.example.com/${file.key}`,
      }),
    );
  });

  it('throws ConflictException when file status is not pending or ready', async () => {
    const file = {
      ...baseFile(),
      status: EFileStatus.FAILED,
    };
    mockTransactionalFilesRepository.findOne.mockResolvedValue(file);

    await expect(
      service.completeUpload(ownerUser, completeDto),
    ).rejects.toThrow(ConflictException);
  });

  it('throws BadRequestException when uploaded object is missing in storage', async () => {
    mockTransactionalFilesRepository.findOne.mockResolvedValue(baseFile());
    mockS3Service.objectExists.mockResolvedValue(false);

    await expect(
      service.completeUpload(ownerUser, completeDto),
    ).rejects.toThrow(BadRequestException);
  });

  it('marks a pending user file as ready and binds avatar', async () => {
    const file = baseFile();
    const savedFile = {
      ...file,
      status: EFileStatus.READY,
    };

    mockTransactionalFilesRepository.findOne.mockResolvedValue(file);
    mockS3Service.objectExists.mockResolvedValue(true);
    mockTransactionalFilesRepository.save.mockResolvedValue(savedFile);
    mockTransactionalUsersRepository.update.mockResolvedValue({ affected: 1 });

    const result = await service.completeUpload(ownerUser, completeDto);

    expect(mockS3Service.objectExists).toHaveBeenCalledWith(file.key);
    expect(mockTransactionalFilesRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: file.id,
        status: EFileStatus.READY,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: file.id,
        status: EFileStatus.READY,
      }),
    );
  });

  it('binds a product image when completing a product-owned file', async () => {
    const productFile = {
      ...baseFile(),
      ownerType: EFileOwnerType.PRODUCT,
      ownerId: 'product-1',
      key: 'products/product-1/images/product.webp',
      mimeType: 'image/webp',
    };
    const savedProductFile = {
      ...productFile,
      status: EFileStatus.READY,
    };

    mockTransactionalFilesRepository.findOne.mockResolvedValue(productFile);
    mockS3Service.objectExists.mockResolvedValue(true);
    mockTransactionalFilesRepository.save.mockResolvedValue(savedProductFile);
    mockTransactionalProductsRepository.findOne.mockResolvedValue({
      id: 'product-1',
    });
    mockTransactionalProductImagesRepository.exists.mockResolvedValue(false);
    mockTransactionalProductImagesRepository.count.mockResolvedValue(0);
    mockTransactionalProductImagesRepository.save.mockResolvedValue({
      id: 'product-image-1',
    });

    const result = await service.completeUpload(adminUser, completeDto);

    expect(mockTransactionalProductsRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'product-1' },
      lock: { mode: 'pessimistic_write' },
    });
    expect(
      mockTransactionalProductImagesRepository.create,
    ).toHaveBeenCalledWith({
      productId: 'product-1',
      fileId: productFile.id,
      sortOrder: 0,
      isPrimary: true,
    });
    expect(mockTransactionalProductImagesRepository.save).toHaveBeenCalledWith({
      productId: 'product-1',
      fileId: productFile.id,
      sortOrder: 0,
      isPrimary: true,
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: productFile.id,
        status: EFileStatus.READY,
      }),
    );
  });

  it('does not create duplicate product image binding when already linked', async () => {
    const productFile = {
      ...baseFile(),
      ownerType: EFileOwnerType.PRODUCT,
      ownerId: 'product-1',
    };

    mockTransactionalFilesRepository.findOne.mockResolvedValue({
      ...productFile,
      status: EFileStatus.READY,
    });
    mockTransactionalProductsRepository.findOne.mockResolvedValue({
      id: 'product-1',
    });
    mockTransactionalProductImagesRepository.exists.mockResolvedValue(true);

    await service.completeUpload(adminUser, completeDto);

    expect(
      mockTransactionalProductImagesRepository.count,
    ).not.toHaveBeenCalled();
    expect(
      mockTransactionalProductImagesRepository.save,
    ).not.toHaveBeenCalled();
  });
});
