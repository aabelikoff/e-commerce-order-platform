import { ApiProperty } from '@nestjs/swagger';

export class PaginationOffsetMetaDto {
  @ApiProperty({ description: 'Number of items', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Offset', example: 100 })
  offset: number;

  @ApiProperty({ description: 'Total items', example: 1000 })
  total: number;
}
