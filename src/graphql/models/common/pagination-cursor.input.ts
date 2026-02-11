import {
  ArgsType,
  Field,
  GraphQLISODateTime,
  ID,
  InputType,
  Int,
} from '@nestjs/graphql';
import {
  ValidateNested,
  IsOptional,
  IsInt,
  Min,
  IsString,
  IsUUID,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class CursorInput {
  @Field(() => GraphQLISODateTime)
  @IsDate()
  createdAt!: Date;

  @Field(() => ID)
  @IsUUID()
  @IsString()
  id!: string;
}

@InputType()
export class PaginationCursorInput {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  limit: number = 20;

  @Field(() => CursorInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => CursorInput)
  after?: CursorInput;
}
