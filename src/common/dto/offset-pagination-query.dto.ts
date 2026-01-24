import { IsInt, Min, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class OffsetPaginationQueryDto {
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value ? Number(value) : 10))
  limit: number;

  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value ? Number(value) : 1))
  page: number;
}
