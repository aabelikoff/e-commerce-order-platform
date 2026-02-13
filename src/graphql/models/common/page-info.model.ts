import { ObjectType, Field } from '@nestjs/graphql';
import { IsBoolean, IsOptional } from 'class-validator';

@ObjectType()
export class PageInfo {
  @Field()
  hasNextPage: boolean;

  @Field(() => String, { nullable: true })
  endCursor?: string | null;
}
