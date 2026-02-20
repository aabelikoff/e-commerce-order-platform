import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, Product, OrderItem, Payment } from '../../database/entities';
import { LoadersFactory } from './loaders.factory';

@Module({
  imports: [TypeOrmModule.forFeature([User, Product, OrderItem, Payment])],
  providers: [LoadersFactory],
  exports: [LoadersFactory]
})
export class LoadersModule {}



