import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CanPayGuard } from './guards/can-pay.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Payment } from 'src/database/entities/payment.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from 'src/database/entities/order.entity';
import { KafkaModule } from 'src/kafka/kafka.module';
import { PaymentsEventsPublisher } from './payments-events.publisher';
import { PaymentsAnalyticsConsumer } from './payments-analytics.consumer';
import { PaymentsAuditConsumer } from './payments-audit.consumer';
import {
  PAYMENTS_GRPC_CLIENT,
  PAYMENTS_PACKAGE_NAME,
} from 'src/common/grpc/grpc.constants';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IPaymentsServiceConfig } from 'src/config/payments-service';
import { join } from 'path';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Order]),
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
    KafkaModule,
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    CanPayGuard,
    JwtAuthGuard,
    PaymentsEventsPublisher,
    PaymentsAnalyticsConsumer,
    PaymentsAuditConsumer,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
