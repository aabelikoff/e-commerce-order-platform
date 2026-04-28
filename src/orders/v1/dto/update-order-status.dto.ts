import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { EOrderStatus } from 'src/database/entities';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: EOrderStatus, example: EOrderStatus.SHIPPED })
  @IsEnum(EOrderStatus)
  status: EOrderStatus;
}
