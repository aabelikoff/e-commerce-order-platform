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
import { Scopes } from 'src/auth/decorators';
import { EPaymentScopes } from 'src/auth/access/scopes';
import { AuthUser } from 'src/auth/types';
import { Request } from 'express';
import { AccessGuard } from 'src/auth/guards/access.guard';

@Controller('orders')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard, CanPayGuard)
  @Post(':orderId/pay')
  async pay(
    @Param('orderId', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: AuthUser },
  ): Promise<Payment> {
      const user = req.user;
      console.log('PaymentsController.pay called with orderId:', id, 'and user:', user);
    return this.paymentsService.payOrder(id, user);
  }
}
