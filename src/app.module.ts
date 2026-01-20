import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ProfilesModule } from './profiles/profiles.module';
import { ReportingsModule } from './reportings/reportings.module';
import { NotificationsModule } from './notifications/notifications.module';

import { appConfig } from './config/app/app.config';
import { databaseConfig } from './config/database/database.config';

import { logger, LoggerMiddleware } from './common/middleware/logger.middleware';
import { UsersController } from './users/users.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [appConfig, databaseConfig],
      envFilePath: ['.env', '.env.development.local'],
      isGlobal: true,
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
      .forRoutes(UsersController);
  }

  onModuleInit() {
    console.log('AppModule initialized');
  }

  onModuleDestroy() {
    console.log('AppModule destroyed');
  }
}
