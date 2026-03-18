import { Module } from '@nestjs/common';
import { OrdersV1Controller } from './v1/orders.controller.v1';
import { OrdersService } from './orders.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItem, Order, Product, User } from 'src/database/entities';
import { OrdersEventsService } from './orders-events.service';
import { RabbitmqModule } from 'src/rabbitmq/rabbitmq.module';
import { OrdersProcessorConsumer } from './orders-processor.consumer';
import { OutboxModule } from 'src/outbox/outbox.module';
import { KafkaModule } from 'src/kafka/kafka.module';
import { OrdersAnalyticsConsumer } from './orders-analytics.consumer';
import { OrdersCrmConsumer } from './orders-crm.consumer';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  PAYMENTS_GRPC_CLIENT,
  PAYMENTS_PACKAGE_NAME,
} from 'src/common/grpc/grpc.constants';
import { join } from 'path';
import { IPaymentsServiceConfig } from 'src/config/payments-service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product, User]),
    ClientsModule.registerAsync([
      {
        name: PAYMENTS_GRPC_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: PAYMENTS_PACKAGE_NAME,
            protoPath: join(
              process.cwd(),
              'proto',
              'payments',
              'v1',
              'payments.proto',
            ),
            url:
              configService.get<IPaymentsServiceConfig['paymentsGrpcUrl']>(
                'paymentsServiceConfig.paymentsGrpcUrl',
              ) ?? 'localhost:5021',
          },
        }),
      },
    ]),
    RabbitmqModule,
    OutboxModule,
    KafkaModule,
  ],
  controllers: [OrdersV1Controller],
  providers: [
    OrdersService,
    OrdersEventsService,
    OrdersProcessorConsumer,
    OrdersAnalyticsConsumer,
    OrdersCrmConsumer,
  ],
  exports: [OrdersEventsService, OrdersService],
})
export class OrdersModule {}
