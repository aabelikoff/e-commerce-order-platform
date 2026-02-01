import { IsInt, Min, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CursorPaginationQueryDto {
  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value ? Number(value) : 10))
  limit: number = 10;

  @ApiPropertyOptional({ example: 'eyJpZCI6ICJzb20gdXVpZCIsICJjcmVhdGVkQXQiOiAic29tIGRhdGUifQ==' })
  @IsOptional()
  @IsString()
  cursor?: string;
}
