import { ObjectType, Field, ID, Float } from '@nestjs/graphql';

@ObjectType({ description: 'Represents a registered user(customer) in the system' })
export class UserModel {
  @Field(() => ID, {
    description: 'Unique identifier of the user (UUID)',
  })
  id: string;

  @Field(() => String, {
    description: 'User first name',
  })
  firstName: string;

  @Field(() => String, {
    description: 'User last name',
  })
  lastName: string;

  @Field(() => String, {
    description: 'User email address (unique)',
  })
  email: string;
}