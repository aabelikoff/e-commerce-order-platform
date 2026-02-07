import { Module } from '@nestjs/common';
import { ProductsV1Controller } from './v1/products.controller.v1';
import { ProductsService } from './products.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from 'src/database/entities';

@Module({
  controllers: [ProductsV1Controller],
  providers: [ProductsService],
  imports: [TypeOrmModule.forFeature([Product])],
  exports: [ProductsService]
})
export class ProductsModule {}
