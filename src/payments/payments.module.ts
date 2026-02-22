import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CanPayGuard } from './guards/can-pay.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Type } from 'class-transformer';
import { Payment } from 'src/database/entities/payment.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from 'src/database/entities/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Order])],
  controllers: [PaymentsController],
  providers: [PaymentsService, CanPayGuard, JwtAuthGuard],
  exports: [PaymentsService],
})
export class PaymentsModule {}
