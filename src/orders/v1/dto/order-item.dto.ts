import { IsNumber, IsOptional, IsString, Min, Validate } from 'class-validator';

export class OrderItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}
