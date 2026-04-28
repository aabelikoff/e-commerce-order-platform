import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { paginateQueryBuilderByCursor } from 'src/common/pagination/cursor/paginate-query-builder';
import { Product } from 'src/database/entities';
import { NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './v1/dto/create-product.dto';
import { FindProductsQueryDto } from './v1/dto/find-products.query.dto';
import { ProductsService } from './products.service';
import { UpdateProductDto } from './v1/dto/update-product.dto';

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
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
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
    const query: FindProductsQueryDto = {
      limit: 10,
    };

    await service.findProducts(query);

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
    const query: FindProductsQueryDto = {
      fields: ['name', 'price', 'items', 'unknown'],
      limit: 5,
    };

    await service.findProducts(query);

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
    const query: FindProductsQueryDto = {
      q: '  phone ',
      limit: 10,
    };

    await service.findProducts(query);

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('p.name ILIKE :q', {
      q: '%phone%',
    });
  });

  it('does not add filter when q becomes empty after trimming', async () => {
    const query: FindProductsQueryDto = {
      q: '   ',
      limit: 10,
    };

    await service.findProducts(query);

    expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
  });

  it('applies stable ordering before pagination', async () => {
    const query: FindProductsQueryDto = {
      limit: 20,
    };

    await service.findProducts(query);

    expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
      'p.createdAt',
      'DESC',
    );
    expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('p.id', 'DESC');
  });

  it('creates product with normalized values', async () => {
    const dto: CreateProductDto = {
      name: '  Keyboard  ',
      price: '129.99',
      description: '  RGB mechanical keyboard  ',
      stock: 15,
    };
    const created = {
      id: 'product-1',
      name: 'Keyboard',
      price: '129.99',
      description: 'RGB mechanical keyboard',
      stock: '15',
    };

    mockProductsRepository.create.mockReturnValue(created);
    mockProductsRepository.save.mockResolvedValue(created);

    const result = await service.createProduct(dto);

    expect(mockProductsRepository.create).toHaveBeenCalledWith({
      name: 'Keyboard',
      price: '129.99',
      description: 'RGB mechanical keyboard',
      stock: '15',
    });
    expect(mockProductsRepository.save).toHaveBeenCalledWith(created);
    expect(result).toBe(created);
  });

  it('updates existing product with normalized values', async () => {
    const existing = {
      id: 'product-1',
      name: 'Old Name',
      price: '99.99',
      description: 'Old description',
      stock: '5',
    };
    const dto: UpdateProductDto = {
      name: '  New Name  ',
      description: '  Updated description  ',
      stock: 7,
    };

    mockProductsRepository.findOne.mockResolvedValue(existing);
    mockProductsRepository.save.mockImplementation(async (product) => product);

    const result = await service.updateProduct('product-1', dto);

    expect(mockProductsRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'product-1' },
    });
    expect(mockProductsRepository.save).toHaveBeenCalledWith({
      id: 'product-1',
      name: 'New Name',
      price: '99.99',
      description: 'Updated description',
      stock: '7',
    });
    expect(result).toEqual({
      id: 'product-1',
      name: 'New Name',
      price: '99.99',
      description: 'Updated description',
      stock: '7',
    });
  });

  it('throws NotFoundException when updating missing product', async () => {
    mockProductsRepository.findOne.mockResolvedValue(null);

    await expect(
      service.updateProduct('missing-product', { name: 'Updated' }),
    ).rejects.toThrow(NotFoundException);
    expect(mockProductsRepository.save).not.toHaveBeenCalled();
  });
});
