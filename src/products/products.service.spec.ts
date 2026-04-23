import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { paginateQueryBuilderByCursor } from 'src/common/pagination/cursor/paginate-query-builder';
import { Product } from 'src/database/entities';
import { ProductsService } from './products.service';

jest.mock('src/common/pagination/cursor/paginate-query-builder', () => ({
  paginateQueryBuilderByCursor: jest.fn(),
}));

describe('ProductsService', () => {
  let service: ProductsService;

  const paginateMock = paginateQueryBuilderByCursor as jest.MockedFunction<
    typeof paginateQueryBuilderByCursor
  >;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
  };

  const mockProductsRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    paginateMock.mockResolvedValue({
      items: [],
      pagination: {
        hasNext: false,
        nextCursor: null,
      },
    } as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductsRepository,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('selects default direct fields when fields are not provided', async () => {
    const query = {
      limit: 10,
    };

    await service.findProducts(query as any);

    expect(mockProductsRepository.createQueryBuilder).toHaveBeenCalledWith('p');
    expect(mockQueryBuilder.select).toHaveBeenNthCalledWith(1, 'p.id');
    expect(mockQueryBuilder.select).toHaveBeenNthCalledWith(2, [
      'p.id',
      'p.name',
      'p.price',
      'p.description',
      'p.stock',
      'p.createdAt',
      'p.updatedAt',
    ]);
    expect(mockQueryBuilder.leftJoin).not.toHaveBeenCalled();
    expect(paginateMock).toHaveBeenCalledWith(mockQueryBuilder, query, 'p');
  });

  it('selects only allowed direct fields and joins items when requested', async () => {
    const query = {
      fields: ['name', 'price', 'items', 'unknown'],
      limit: 5,
    };

    await service.findProducts(query as any);

    expect(mockQueryBuilder.select).toHaveBeenNthCalledWith(1, 'p.id');
    expect(mockQueryBuilder.select).toHaveBeenNthCalledWith(2, [
      'p.id',
      'p.createdAt',
      'p.name',
      'p.price',
    ]);
    expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith('p.items', 'items');
    expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith([
      'items.id',
      'items.quantity',
      'items.unitPrice',
      'items.discountAmount',
    ]);
  });

  it('adds name filter when q is present after trimming', async () => {
    const query = {
      q: '  phone ',
      limit: 10,
    };

    await service.findProducts(query as any);

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('p.name ILIKE :q', {
      q: '%phone%',
    });
  });

  it('does not add filter when q becomes empty after trimming', async () => {
    const query = {
      q: '   ',
      limit: 10,
    };

    await service.findProducts(query as any);

    expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
  });

  it('applies stable ordering before pagination', async () => {
    const query = {
      limit: 20,
    };

    await service.findProducts(query as any);

    expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
      'p.createdAt',
      'DESC',
    );
    expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('p.id', 'DESC');
  });
});
