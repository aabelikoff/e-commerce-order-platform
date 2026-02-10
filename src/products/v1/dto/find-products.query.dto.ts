import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsIn,
  IsInt,
  Min,
  Max,
  IsArray,
} from 'class-validator';

export class FindProductsQueryDto {
  @IsOptional()
  @IsString()
  q?: string; // name

  @IsOptional()
  @IsIn(['price', 'createdAt', 'name'])
  sort?: 'price' | 'createdAt' | 'name';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === 'string') {
      return value.split(',').map((v) => v.trim()).filter(Boolean);
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
