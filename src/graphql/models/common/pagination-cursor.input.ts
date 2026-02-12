import {
  Field,
  InputType,
  Int,
} from '@nestjs/graphql';
import {
  ValidateNested,
  IsOptional,
  IsInt,
  Min,
  IsString,
} from 'class-validator';

@InputType()
export class PaginationCursorInput {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  limit: number = 20;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  cursor?: string;
}
