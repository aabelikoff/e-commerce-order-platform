import { Controller, Get, Query } from '@nestjs/common';
import { ProductsService } from '../products.service';
import { FindProductsQueryDto } from './dto/find-products.query.dto';
import { Product } from 'src/database/entities';
import { ResponseListDto } from 'src/common/dto/response-list.dto';

@Controller('products')
export class ProductsV1Controller {
  constructor(private readonly productService: ProductsService) {}

  @Get()
  async findProducts(
    @Query() query: FindProductsQueryDto,
  ): Promise<ResponseListDto<Product>> {
    return await this.productService.findProducts(query);
  }
}
