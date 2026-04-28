import { ApiProperty } from '@nestjs/swagger';
import { PaginationCursorMetaDto } from 'src/common/dto/pagination-cursor-meta.dto';
import { EOrderStatus } from 'src/database/entities';

export class OrderItemResponseDto {
  @ApiProperty({ example: '5b9d9f34-6d73-4f2a-a933-7ec49d4c650a' })
  productId!: string;

  @ApiProperty({ example: 2 })
  quantity!: number;
}

export class OrderResponseDto {
  @ApiProperty({ example: '5b9d9f34-6d73-4f2a-a933-7ec49d4c650a' })
  id!: string;

  @ApiProperty({ example: '0b4ecf48-3fba-4ae4-9b2a-2c4daa3f1484' })
  userId!: string;

  @ApiProperty({ enum: EOrderStatus, example: EOrderStatus.PENDING })
  status!: EOrderStatus;

  @ApiProperty({ example: '149.99' })
  totalAmount!: string;

  @ApiProperty({ example: '2026-04-28T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-04-28T12:01:00.000Z' })
  updatedAt!: Date;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items!: OrderItemResponseDto[];
}

export class OrdersListResponseDto {
  @ApiProperty({ type: [OrderResponseDto] })
  items!: OrderResponseDto[];

  @ApiProperty({ type: PaginationCursorMetaDto })
  pagination!: PaginationCursorMetaDto;
}
