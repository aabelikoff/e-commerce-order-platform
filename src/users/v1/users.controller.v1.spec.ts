import { Test, TestingModule } from '@nestjs/testing';
import { CursorPaginationQueryDto } from 'src/common/dto/cursor-pagination-query.dto';
import { User } from 'src/database/entities';
import { UsersService } from '../users.service';
import { CreateUserDto } from './dto';
import { UsersV1Controller } from './users.controller.v1';

describe('UsersController', () => {
  let controller: UsersV1Controller;

  const mockUsersService = {
    create: jest.fn(),
    getById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersV1Controller],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersV1Controller>(UsersV1Controller);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates create to UsersService', async () => {
    const dto: CreateUserDto = {
      firstName: 'Alice',
      lastName: 'Doe',
      email: 'alice@example.com',
      password: 'secret123',
    };

    mockUsersService.create.mockResolvedValue({
      id: 'user-1',
      firstName: 'Alice',
      lastName: 'Doe',
      email: 'alice@example.com',
    });

    const result = await controller.create(dto);

    expect(mockUsersService.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({
      id: 'user-1',
      firstName: 'Alice',
      lastName: 'Doe',
      email: 'alice@example.com',
    });
  });

  it('delegates getOne to UsersService', async () => {
    const user = {
      id: 'user-1',
      email: 'alice@example.com',
    };

    mockUsersService.getById.mockResolvedValue(user);

    const result = await controller.getOne('user-1');

    expect(mockUsersService.getById).toHaveBeenCalledWith('user-1');
    expect(result).toEqual(user);
  });

  it('delegates getAll to UsersService', async () => {
    const response = {
      items: [{ id: 'user-1' } as User],
      pagination: {
        hasNext: false,
        nextCursor: null,
      },
    };

    mockUsersService.findAll.mockResolvedValue(response);

    const query: CursorPaginationQueryDto = {
      limit: 10,
      cursor: 'cursor-1',
    };
    const result = await controller.getAll(query);

    expect(mockUsersService.findAll).toHaveBeenCalledWith(query);
    expect(result).toEqual(response);
  });

  it('delegates update to UsersService', async () => {
    const updatedUser = {
      id: 'user-1',
      firstName: 'Updated',
    };
    const dto = {
      firstName: 'Updated',
    };

    mockUsersService.update.mockResolvedValue(updatedUser);

    const result = await controller.update('user-1', dto);

    expect(mockUsersService.update).toHaveBeenCalledWith('user-1', dto);
    expect(result).toEqual(updatedUser);
  });
});
