import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CanPayGuard } from './guards/can-pay.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, CanPayGuard, JwtAuthGuard],
})
export class PaymentsModule {}
