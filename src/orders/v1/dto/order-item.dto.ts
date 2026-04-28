import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min, Validate } from 'class-validator';

export class OrderItemDto {
  @ApiProperty({
    description: 'Product id',
    example: '5b9d9f34-6d73-4f2a-a933-7ec49d4c650a',
  })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Requested quantity', example: 2, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;
}
