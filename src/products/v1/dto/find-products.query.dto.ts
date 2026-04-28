import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsArray, IsIn } from 'class-validator';
import { CursorPaginationQueryDto } from 'src/common/dto/cursor-pagination-query.dto';

export class FindProductsQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Case-insensitive search by product name',
    example: 'keyboard',
  })
  @IsOptional()
  @IsString()
  q?: string; // name

  @ApiPropertyOptional({
    description: 'Comma-separated or repeated list of fields to include',
    example: ['id', 'name', 'price'],
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    }
    return [];
  })
  @IsArray()
  @IsString({ each: true })
  @IsIn(
    [
      'id',
      'name',
      'price',
      'description',
      'stock',
      'items',
      'createdAt',
      'updatedAt',
    ],
    { each: true },
  )
  fields?: string[];
}
