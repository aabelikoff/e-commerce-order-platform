import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportingsModule } from './reportings/reportings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';

import { TypeOrmModule } from '@nestjs/typeorm';
import {
  getEnvFilePath,
  databaseConfig,
  appConfig,
  IDatabaseConfig,
} from './config';

import {
  logger,
  LoggerMiddleware,
} from './common/middleware/logger.middleware';
import { UsersV1Controller } from './users/v1/users.controller.v1';
import { User, Order, OrderItem, Product } from './database/entities';
import { AppGraphqlModule } from './graphql/graphql.module';
import { authConfig } from './config/auth/auth.config';
import { s3Config } from './config/s3';
import { FilesModule } from './files/files.module';
import { S3Service } from './files/s3.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [appConfig, databaseConfig, authConfig, s3Config],
      envFilePath: getEnvFilePath(),
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const db = cfg.get<IDatabaseConfig>('database', {
          infer: true,
        }) as IDatabaseConfig;
        return {
          type: 'postgres',
          host: db.host,
          port: db.port,
          username: db.user,
          password: db.password,
          database: db.name,
          autoLoadEntities: true,
          synchronize: false,
          entities: [User, Order, OrderItem, Product],
          logging: ['query'],
        };
      },
    }),
    UsersModule,
    AuthModule,
    ProductsModule,
    OrdersModule,
    PaymentsModule,
    ReportingsModule,
    NotificationsModule,
    AppGraphqlModule,
    FilesModule,
  ],
  controllers: [],
  providers: [S3Service],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      // .apply(LoggerMiddleware)
      .apply(logger)
      .exclude(
        'users/{*wildcard}',
        { method: RequestMethod.PATCH, path: 'users' },
        { method: RequestMethod.PUT, path: 'users' },
      )
      .forRoutes(UsersV1Controller);
  }

  onModuleInit() {
    console.log('AppModule initialized');
  }

  onModuleDestroy() {
    console.log('AppModule destroyed');
  }
}
