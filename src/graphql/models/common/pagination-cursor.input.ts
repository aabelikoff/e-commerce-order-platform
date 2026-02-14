import { Field, InputType, Int } from '@nestjs/graphql';
import {
  ValidateNested,
  IsOptional,
  IsInt,
  Min,
  IsString,
  Max,
} from 'class-validator';

@InputType({
  description: 'Cursor-based pagination input',
})
export class PaginationCursorInput {
  @Field(() => Int, {
    description: 'Maximum number of records to return (1–100)',
  })
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @Field(() => String, {
    nullable: true,
    description: 'Opaque cursor returned from previous query for fetching next page',
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}