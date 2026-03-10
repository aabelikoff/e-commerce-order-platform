import { Module } from '@nestjs/common';
import { PaymentsGrpcController } from './payments.grpc.controller';
import { PaymentsService } from './payments.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { databaseConfig, getEnvFilePath, IDatabaseConfig } from 'src/config';
import { paymentsServiceConfig } from '../config/payments-service/payments-service.config';
import { kafkaConfig } from '../config/kafka';
import { rabbitMQConfig } from '../config/rabbitmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  FileRecord,
  Order,
  OrderItem,
  OutboxEvent,
  Payment,
  ProcessedMessage,
  Product,
  ProductImage,
  User,
} from '../database/entities';
import { KafkaModule } from '../kafka/kafka.module';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [
        paymentsServiceConfig,
        kafkaConfig,
        rabbitMQConfig,
        databaseConfig,
      ],
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
          entities: [
            User,
            Order,
            OrderItem,
            Product,
            Payment,
            FileRecord,
            ProductImage,
            ProcessedMessage,
            OutboxEvent,
            FileRecord
          ],
          logging: false,
        };
      },
    }),
    TypeOrmModule.forFeature([Payment]),
    KafkaModule,
    RabbitmqModule,
  ],
  controllers: [PaymentsGrpcController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
