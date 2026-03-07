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

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Order]), KafkaModule],
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
