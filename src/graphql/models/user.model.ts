import { ObjectType, Field, ID, Float } from '@nestjs/graphql';

@ObjectType()
export class UserModel {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  firstName: string;

  @Field(() => String)
  lastName: string;
    
  @Field(() => String)
  email: string;
}