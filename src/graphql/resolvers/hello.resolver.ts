import { Resolver, Query } from '@nestjs/graphql';

@Resolver()
export class HelloResolver {
  @Query(() => String)
  hello(): string {
    return 'ok';
  }
}
