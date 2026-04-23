import { Test, TestingModule } from '@nestjs/testing';
import { ERoles } from 'src/auth/access/roles';
import { AuthUser } from 'src/auth/types';
import {
  EFileOwnerType,
  EFileStatus,
} from 'src/database/entities/file-record.entity';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

describe('FilesController', () => {
  let controller: FilesController;

  const mockFilesService = {
    createPresignedUpload: jest.fn(),
    completeUpload: jest.fn(),
    getFileById: jest.fn(),
  };

  const user: AuthUser = {
    sub: 'user-1',
    email: 'alice@example.com',
    roles: [ERoles.USER],
    scopes: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        {
          provide: FilesService,
          useValue: mockFilesService,
        },
      ],
    }).compile();

    controller = module.get<FilesController>(FilesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates presign to FilesService', async () => {
    const dto = {
      ownerType: EFileOwnerType.USER,
      ownerId: 'user-1',
      contentType: 'image/png',
      sizeBytes: 512,
    };

    mockFilesService.createPresignedUpload.mockResolvedValue({
      fileId: 'file-1',
      key: 'users/user-1/avatars/file.png',
      uploadUrl: 'https://upload.example.com/file-1',
      contentType: 'image/png',
    });

    const result = await controller.presign({ user } as any, dto);

    expect(mockFilesService.createPresignedUpload).toHaveBeenCalledWith(
      user,
      dto,
    );
    expect(result).toEqual({
      fileId: 'file-1',
      key: 'users/user-1/avatars/file.png',
      uploadUrl: 'https://upload.example.com/file-1',
      contentType: 'image/png',
    });
  });

  it('delegates complete to FilesService', async () => {
    const dto = {
      fileId: 'file-1',
    };

    mockFilesService.completeUpload.mockResolvedValue({
      id: 'file-1',
      status: EFileStatus.READY,
    });

    const result = await controller.complete({ user } as any, dto);

    expect(mockFilesService.completeUpload).toHaveBeenCalledWith(user, dto);
    expect(result).toEqual({
      id: 'file-1',
      status: EFileStatus.READY,
    });
  });

  it('delegates getById to FilesService', async () => {
    mockFilesService.getFileById.mockResolvedValue({
      id: 'file-1',
      ownerId: 'user-1',
    });

    const result = await controller.getById({ user } as any, 'file-1');

    expect(mockFilesService.getFileById).toHaveBeenCalledWith(user, 'file-1');
    expect(result).toEqual({
      id: 'file-1',
      ownerId: 'user-1',
    });
  });
});
