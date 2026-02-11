import { Module } from '@nestjs/common';
import { LoadersFactory } from './loaders.factory';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, Product, OrderItem } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([User, Product, OrderItem])],
  exports: [LoadersFactory],
  providers: [LoadersFactory],
})
export class LoadersModule {}
