import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from 'src/database/entities';
import {
  OrdersResolver,
} from './resolvers/orders.resolver';
import { OrdersQlService } from './services/orders-ql.service';
import { LoadersModule } from './loaders/loaders.module';
import { LoadersFactory } from './loaders/loaders.factory';
import { OrderItemResolver } from './resolvers/order-items.resolver';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [LoadersModule],
      inject: [LoadersFactory],
      useFactory: (loadersFactory: LoadersFactory) => ({
        autoSchemaFile: true,
        path: '/graphql',
        graphiql: true,
        introspection: true,
        context: ({ req }) => ({
          req,
          loaders: loadersFactory.create(),
        }),
      }),
    }),
  ],
  providers: [
    OrdersQlService,
    OrdersResolver,
    OrderItemResolver,
  ],
})
export class AppGraphqlModule {}
