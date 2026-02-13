import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, Product, OrderItem } from '../../database/entities';
import { LoadersFactory } from './loaders.factory';

@Module({
  imports: [TypeOrmModule.forFeature([User, Product, OrderItem])],
  providers: [LoadersFactory],
  exports: [LoadersFactory]
})
export class LoadersModule {}



