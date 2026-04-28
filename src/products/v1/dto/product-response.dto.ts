import { ApiProperty } from '@nestjs/swagger';
import { PaginationCursorMetaDto } from 'src/common/dto/pagination-cursor-meta.dto';

export class ProductResponseDto {
  @ApiProperty({ example: '9ac42c67-2d7e-4898-91dd-d2e31fd80503' })
  id!: string;

  @ApiProperty({ example: 'Mechanical Keyboard' })
  name!: string;

  @ApiProperty({ example: '149.99' })
  price!: string;

  @ApiProperty({
    example: 'Wireless mechanical keyboard with hot-swappable switches',
  })
  description!: string;

  @ApiProperty({ example: 42 })
  stock!: number;

  @ApiProperty({ example: '2026-04-28T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-04-28T12:05:00.000Z' })
  updatedAt!: Date;
}

export class ProductsListResponseDto {
  @ApiProperty({ type: [ProductResponseDto] })
  items!: ProductResponseDto[];

  @ApiProperty({ type: PaginationCursorMetaDto })
  pagination!: PaginationCursorMetaDto;
}
