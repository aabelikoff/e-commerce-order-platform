import { Test, TestingModule } from '@nestjs/testing';
import { OrdersV1Controller } from './orders.controller.v1';

describe('OrdersController', () => {
  let controller: OrdersV1Controller;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersV1Controller],
    }).compile();

    controller = module.get<OrdersV1Controller>(OrdersV1Controller);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
