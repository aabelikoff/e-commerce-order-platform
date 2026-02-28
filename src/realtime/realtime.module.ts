import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { OrdersModule } from 'src/orders/orders.module';
import { OrdersGateway } from './orders.gateway';

@Module({
    imports: [AuthModule, OrdersModule],
    providers: [OrdersGateway],
})
export class RealtimeModule {}
