import { IsInt, Min, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CursorPaginationQueryDto {
  @IsInt()
  @Min(1)
  @Transform(({ value }) => value ? Number(value) : 10)
  limit: number;

  @IsOptional()
  @IsString()
  cursor?: string;
}
