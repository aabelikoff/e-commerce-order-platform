import { Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { Payment } from '../database/entities';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CanPayGuard } from './guards/can-pay.guard';

@Controller('payments')
export class PaymentsController {

    constructor(private paymentsService: PaymentsService) { }
    
    @UseGuards(JwtAuthGuard, CanPayGuard)
    @Post(':id/pay')
    async pay (@Param('id', ParseUUIDPipe) id: string): Promise<Payment> {
        return this.paymentsService.payOrder(id);
    }
}
