import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { HelloResolver } from './resolvers/hello.resolver';
import { OrdersService } from './services/orders.service';
import { OrdersResolver, OrderItemResolver } from './resolvers/orders.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, Product, Order, OrderItem } from '../database/entities';

@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      useFactory: () => ({
        autoSchemaFile: true,
        path: '/graphql',
        graphiql: true,
        introspection: true,
        context: ({ req }) => ({
          req,
        }),
      }),
    }),
    TypeOrmModule.forFeature([User, Product, Order, OrderItem])
  ],
  exports: [OrdersService],
  providers: [HelloResolver, OrdersService, OrdersResolver, OrderItemResolver],
})
export class AppGraphqlModule {}
