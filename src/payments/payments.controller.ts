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
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PaymentResponseDto } from './dto/payment-response.dto';

@Controller('orders')
@ApiTags('payments')
@ApiBearerAuth()
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard, CanPayGuard)
  @Post(':orderId/pay')
  @PaymentsThrottle()
  @ApiOperation({ summary: 'Pay order by id' })
  @ApiParam({ name: 'orderId', description: 'Order id (UUID)' })
  @ApiOkResponse({ type: PaymentResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  @ApiForbiddenResponse({ description: 'User cannot pay for this order' })
  @ApiNotFoundResponse({ description: 'Order not found' })
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
