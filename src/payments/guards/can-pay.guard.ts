import { ForbiddenError } from '@nestjs/apollo';
import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ERoles } from 'src/auth/access/roles';
import { EPaymentScopes } from 'src/auth/access/scopes';
import { Order } from 'src/database/entities';
import { Not, Repository } from 'typeorm';

@Injectable()
export class CanPayGuard implements CanActivate {
  constructor(
    @InjectRepository(Order) private ordersRepository: Repository<Order>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const user = request.user;
    const orderId = String(request.params?.orderId ?? '');

    if (!orderId) {
      throw new BadRequestException('Order is not specified');
    }

    const order = await this.ordersRepository.findOne({
      where: {
        id: orderId,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const isOwner = order.userId === user.sub;
    if (isOwner) {
      return true;
    }

    const isStaff =
      user.roles?.includes(ERoles.SUPPORT) ||
      user.roles?.includes(ERoles.ADMIN);
    const hasScope = user.scopes?.includes(EPaymentScopes.PAYMENT_WRITE);

    if (isStaff && hasScope) {
      return true;
    }

    throw new ForbiddenException('Not allowed to pay this order');
  }
}
