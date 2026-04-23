import { Test, TestingModule } from '@nestjs/testing';
import { FindProductsQueryDto } from './dto/find-products.query.dto';
import { ProductsV1Controller } from './products.controller.v1';
import { ProductsService } from '../products.service';

describe('ProductsController', () => {
  let controller: ProductsV1Controller;

  const mockProductsService = {
    findProducts: jest.fn(),
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
});
