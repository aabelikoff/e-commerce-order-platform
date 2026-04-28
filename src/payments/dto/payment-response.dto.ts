import { ApiProperty } from '@nestjs/swagger';
import { EPaymentStatus } from 'src/database/entities';

export class PaymentResponseDto {
  @ApiProperty({ example: '9ac42c67-2d7e-4898-91dd-d2e31fd80503' })
  id!: string;

  @ApiProperty({ enum: EPaymentStatus, example: EPaymentStatus.PAID })
  status!: EPaymentStatus;

  @ApiProperty({ example: '5b9d9f34-6d73-4f2a-a933-7ec49d4c650a' })
  orderId!: string;

  @ApiProperty({ example: '149.99' })
  paidAmount!: string;

  @ApiProperty({
    example: '2026-04-28T12:05:00.000Z',
    nullable: true,
    required: false,
  })
  paidAt!: Date | null;

  @ApiProperty({ example: '2026-04-28T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-04-28T12:05:00.000Z' })
  updatedAt!: Date;
}
