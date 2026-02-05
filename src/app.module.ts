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
import { ProfilesModule } from './profiles/profiles.module';
import { ReportingsModule } from './reportings/reportings.module';
import { NotificationsModule } from './notifications/notifications.module';

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

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [appConfig, databaseConfig],
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
        };
      },
    }),
    UsersModule,
    AuthModule,
    ProductsModule,
    OrdersModule,
    PaymentsModule,
    ProfilesModule,
    ReportingsModule,
    NotificationsModule,
  ],
  controllers: [],
  providers: [],
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
