import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException
} from '@nestjs/websockets';
import { Subscription } from 'rxjs';
import { Server, Socket } from 'socket.io';
import { JwtAccessPayload } from '../auth/types';
import { OrderStatusChangedEvent } from '../orders/orders-events.types';
import { OrdersEventsService } from '../orders/orders-events.service';
import { OrdersService } from '../orders/orders.service';

type SubscribeOrderPayload = {
  orderId: string;
};

type RealtimeClientData = {
  user?: JwtAccessPayload;
  subscribeCalls?: number[];
};

@WebSocketGateway({ namespace: '/realtime', cors: { origin: true } })
export class OrdersGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(OrdersGateway.name);
  private eventsSub?: Subscription;

  constructor(
    private readonly jwtService: JwtService,
    private readonly ordersService: OrdersService,
    private readonly ordersEvents: OrdersEventsService
  ) {}

  onModuleInit(): void {
    this.eventsSub = this.ordersEvents.events$.subscribe({
      next: (event) => this.emitOrderStatus(event),
      error: (err) => {
        this.logger.error('orders events subscription failed', err?.stack ?? String(err));
      }
    });
  }

  onModuleDestroy(): void {
    this.eventsSub?.unsubscribe();
  }

  async handleConnection(@ConnectedSocket() client: Socket): Promise<void> {
    const token = this.getTokenFromHandshake(client);
    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtAccessPayload>(token);
      (client.data as RealtimeClientData).user = payload;
      (client.data as RealtimeClientData).subscribeCalls = [];
    } catch (err: any) {
      this.logger.warn(`WS auth failed: ${err?.message ?? String(err)}`);
      client.disconnect();
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket): void {
    const data = client.data as RealtimeClientData;
    if (data.subscribeCalls) {
      data.subscribeCalls.length = 0;
    }
  }

  @SubscribeMessage('subscribeOrder')
  async subscribeOrder(
    @ConnectedSocket() client: Socket,// ios, web, ... 
    @MessageBody() payload: SubscribeOrderPayload
  ): Promise<{ ok: true }> {
    this.assertRateLimit(client);

    const orderId = payload?.orderId;
    if (!orderId || typeof orderId !== 'string') {
      throw new WsException('orderId is required');
    }

    const user = (client.data as RealtimeClientData).user;
    if (!user) {
      throw new WsException('Unauthenticated');
    }

    try {
      await this.ordersService.canSubscribeToOrder(orderId, user);
    } catch (err: any) {
      const message = err?.message ?? 'Subscription denied';
      this.logger.warn(`subscribeOrder denied userId=${user.sub} orderId=${orderId} reason=${message}`);
      throw new WsException(message);
    }
  
    await client.join(this.orderRoom(orderId));

    this.logger.log(`subscribeOrder userId=${user.sub} orderId=${orderId}`);

    return { ok: true };
  }

  @SubscribeMessage('unsubscribeOrder')
  async unsubscribeOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubscribeOrderPayload
  ): Promise<{ ok: true }> {
    const orderId = payload?.orderId;
    if (!orderId || typeof orderId !== 'string') {
      throw new WsException('orderId is required');
    }

    await client.leave(this.orderRoom(orderId));
    return { ok: true };
  }

  private emitOrderStatus(event: OrderStatusChangedEvent): void {
    this.server.to(this.orderRoom(event.orderId)).emit('order.status', event);
  }

  private orderRoom(orderId: string): string {
    return `order:${orderId}`;
  }

  private getTokenFromHandshake(client: Socket): string | null {
    const authToken = (client.handshake.auth as any)?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const header = client.handshake.headers?.authorization;
    if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
      return header.slice('bearer '.length).trim();
    }

    const queryToken = (client.handshake.query as any)?.token;
    if (typeof queryToken === 'string' && queryToken.length > 0) {
      return queryToken;
    }

    return null;
  }

  private assertRateLimit(client: Socket): void {
    const data = client.data as RealtimeClientData;
    const now = Date.now();
    const windowMs = 3000;
    const maxCalls = 5;

    if (!data.subscribeCalls) {
      data.subscribeCalls = [];
    }

    data.subscribeCalls = data.subscribeCalls.filter((t) => now - t < windowMs);
    if (data.subscribeCalls.length >= maxCalls) {
      throw new WsException('Rate limit exceeded');
    }

    data.subscribeCalls.push(now);
  }
}

