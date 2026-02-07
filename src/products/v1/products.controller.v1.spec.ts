import { Test, TestingModule } from '@nestjs/testing';
import { ProductsV1Controller } from './products.controller.v1';

describe('ProductsController', () => {
  let controller: ProductsV1Controller;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsV1Controller],
    }).compile();

    controller = module.get<ProductsV1Controller>(ProductsV1Controller);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
