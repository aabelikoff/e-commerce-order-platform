import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType({
  description: 'Pagination metadata returned with a paginated query',
})
export class PageInfo {
  @Field({
    description: 'Indicates whether more records are available after the current page',
  })
  hasNextPage: boolean;

  @Field(() => String, {
    nullable: true,
    description: 'Cursor to be used for fetching the next page',
  })
  endCursor?: string | null;
}
