import { ObjectType, Field, ID, GraphQLISODateTime } from '@nestjs/graphql';

@ObjectType()
export class DateTimeIdCursor {
  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => ID)
  id!: string;
}

@ObjectType()
export class PageInfo {
  @Field(() => Boolean)
  hasNextPage!: boolean;

  @Field(() => DateTimeIdCursor, { nullable: true })
  endCursor: DateTimeIdCursor | null;
}
