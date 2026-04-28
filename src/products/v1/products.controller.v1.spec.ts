import { Test, TestingModule } from '@nestjs/testing';
import { CreateProductDto } from './dto/create-product.dto';
import { FindProductsQueryDto } from './dto/find-products.query.dto';
import { ProductsV1Controller } from './products.controller.v1';
import { ProductsService } from '../products.service';
import { UpdateProductDto } from './dto/update-product.dto';

describe('ProductsController', () => {
  let controller: ProductsV1Controller;

  const mockProductsService = {
    findProducts: jest.fn(),
    createProduct: jest.fn(),
    updateProduct: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsV1Controller],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsV1Controller>(ProductsV1Controller);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates findProducts to ProductsService', async () => {
    const query: FindProductsQueryDto = {
      q: 'phone',
      fields: ['name', 'price'],
      limit: 10,
    };

    mockProductsService.findProducts.mockResolvedValue({
      items: [{ id: 'product-1' }],
      pagination: {
        hasNext: false,
        nextCursor: null,
      },
    });

    const result = await controller.findProducts(query);

    expect(mockProductsService.findProducts).toHaveBeenCalledWith(query);
    expect(result).toEqual({
      items: [{ id: 'product-1' }],
      pagination: {
        hasNext: false,
        nextCursor: null,
      },
    });
  });

  it('delegates createProduct to ProductsService', async () => {
    const dto: CreateProductDto = {
      name: 'Keyboard',
      price: '129.99',
      description: 'RGB mechanical keyboard',
      stock: 15,
    };

    mockProductsService.createProduct.mockResolvedValue({
      id: 'product-1',
      ...dto,
      stock: '15',
    });

    const result = await controller.createProduct(dto);

    expect(mockProductsService.createProduct).toHaveBeenCalledWith(dto);
    expect(result).toEqual({
      id: 'product-1',
      name: 'Keyboard',
      price: '129.99',
      description: 'RGB mechanical keyboard',
      stock: '15',
    });
  });

  it('delegates updateProduct to ProductsService', async () => {
    const dto: UpdateProductDto = {
      description: 'Updated description',
      stock: 20,
    };

    mockProductsService.updateProduct.mockResolvedValue({
      id: 'product-1',
      name: 'Keyboard',
      price: '129.99',
      description: 'Updated description',
      stock: '20',
    });

    const result = await controller.updateProduct('product-1', dto);

    expect(mockProductsService.updateProduct).toHaveBeenCalledWith(
      'product-1',
      dto,
    );
    expect(result).toEqual({
      id: 'product-1',
      name: 'Keyboard',
      price: '129.99',
      description: 'Updated description',
      stock: '20',
    });
  });
});
