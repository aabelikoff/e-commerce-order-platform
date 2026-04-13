import {
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Payment } from '../database/entities';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CanPayGuard } from './guards/can-pay.guard';
import { AuthUser } from 'src/auth/types';
import { Request } from 'express';
import { PaymentsThrottle } from 'src/common/decorators';
import { buildAuditRequestContext } from 'src/common/audit';

@Controller('orders')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard, CanPayGuard)
  @Post(':orderId/pay')
  @PaymentsThrottle()
  async pay(
    @Param('orderId', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: AuthUser },
  ): Promise<Payment> {
    const user = req.user;
    return this.paymentsService.payOrder(
      id,
      user,
      buildAuditRequestContext(req),
    );
  }
}
