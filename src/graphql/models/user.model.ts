import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType({description: 'User model'})
export class UserModel {
    @Field(() => ID)
    id: string;

    @Field(() => String)
    firstName: string;

    @Field(() => String)
    lastName: string;

    @Field(() => Boolean)
    isActive: boolean;




}