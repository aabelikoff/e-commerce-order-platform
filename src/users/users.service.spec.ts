import * as bcrypt from 'bcrypt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CursorPaginationQueryDto } from 'src/common/dto/cursor-pagination-query.dto';
import { paginateQueryBuilderByCursor } from 'src/common/pagination/cursor/paginate-query-builder';
import { User } from 'src/database/entities';
import { CreateUserDto } from './v1/dto';
import { UsersService } from './users.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

jest.mock('src/common/pagination/cursor/paginate-query-builder', () => ({
  paginateQueryBuilderByCursor: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;

  const hashMock = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;
  const paginateMock = paginateQueryBuilderByCursor as jest.MockedFunction<
    typeof paginateQueryBuilderByCursor
  >;

  const mockQueryBuilder = {
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
  };

  const mockUsersRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    findOneByOrFail: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const emptyPage: Awaited<ReturnType<typeof paginateQueryBuilderByCursor>> =
      {
        items: [],
        pagination: {
          hasNext: false,
          nextCursor: null,
        },
      };
    paginateMock.mockResolvedValue(emptyPage);

    hashMock.mockResolvedValue('hashed-password' as never);
    mockUsersRepository.save.mockImplementation(async (entity: User) => entity);
    mockUsersRepository.update.mockResolvedValue({
      affected: 1,
    });
    mockUsersRepository.delete.mockResolvedValue({
      affected: 1,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('builds a cursor-paginated query for findAll', async () => {
    const query: CursorPaginationQueryDto = {
      limit: 10,
      cursor: 'cursor-1',
    };

    await service.findAll(query);

    expect(mockUsersRepository.createQueryBuilder).toHaveBeenCalledWith('user');
    expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
      'user.createdAt',
      'DESC',
    );
    expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('user.id', 'DESC');
    expect(paginateMock).toHaveBeenCalledWith(mockQueryBuilder, query, 'user');
  });

  it('creates a user with hashed password and returns response dto', async () => {
    const dto: CreateUserDto = {
      firstName: 'Alice',
      lastName: 'Doe',
      email: 'alice@example.com',
      password: 'secret123',
    };
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-02T00:00:00.000Z');

    mockUsersRepository.create.mockImplementation((input: Partial<User>) => ({
      id: 'user-1',
      createdAt,
      updatedAt,
      ...input,
    }));

    const result = await service.create(dto);

    expect(hashMock).toHaveBeenCalledWith('secret123', 10);
    expect(mockUsersRepository.create).toHaveBeenCalledWith({
      firstName: 'Alice',
      lastName: 'Doe',
      email: 'alice@example.com',
      isActive: true,
      passwordHash: 'hashed-password',
    });
    expect(mockUsersRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        email: 'alice@example.com',
        passwordHash: 'hashed-password',
      }),
    );
    expect(result).toEqual({
      id: 'user-1',
      firstName: 'Alice',
      lastName: 'Doe',
      email: 'alice@example.com',
      createdAt,
      updatedAt,
    });
  });

  it('delegates getById and findOne to findOneByOrFail', async () => {
    const user = {
      id: 'user-1',
      email: 'alice@example.com',
    } as unknown as User;

    mockUsersRepository.findOneByOrFail.mockResolvedValue(user);

    await expect(service.getById('user-1')).resolves.toBe(user);
    await expect(service.findOne('user-1')).resolves.toBe(user);

    expect(mockUsersRepository.findOneByOrFail).toHaveBeenNthCalledWith(1, {
      id: 'user-1',
    });
    expect(mockUsersRepository.findOneByOrFail).toHaveBeenNthCalledWith(2, {
      id: 'user-1',
    });
  });

  it('updates a user and returns the fresh entity', async () => {
    const updatedUser = {
      id: 'user-1',
      firstName: 'Updated',
    } as unknown as User;

    mockUsersRepository.findOneByOrFail.mockResolvedValue(updatedUser);

    const result = await service.update('user-1', {
      firstName: 'Updated',
    });

    expect(mockUsersRepository.update).toHaveBeenCalledWith('user-1', {
      firstName: 'Updated',
    });
    expect(mockUsersRepository.findOneByOrFail).toHaveBeenCalledWith({
      id: 'user-1',
    });
    expect(result).toBe(updatedUser);
  });

  it('removes a user by id', async () => {
    await expect(service.remove('user-1')).resolves.toBeUndefined();

    expect(mockUsersRepository.delete).toHaveBeenCalledWith('user-1');
  });

  it('deletes a user and returns the deleted entity snapshot', async () => {
    const user = {
      id: 'user-1',
      email: 'alice@example.com',
    } as unknown as User;

    mockUsersRepository.findOneByOrFail.mockResolvedValue(user);

    await expect(service.delete('user-1')).resolves.toBe(user);

    expect(mockUsersRepository.findOneByOrFail).toHaveBeenCalledWith({
      id: 'user-1',
    });
    expect(mockUsersRepository.delete).toHaveBeenCalledWith('user-1');
  });
});
