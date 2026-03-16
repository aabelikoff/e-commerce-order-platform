import { IsEnum } from 'class-validator';
import { EOrderStatus } from 'src/database/entities';

export class UpdateOrderStatusDto {
  @IsEnum(EOrderStatus)
  status: EOrderStatus;
}

