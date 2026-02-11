import { Field, GraphQLISODateTime, ID, ObjectType } from "@nestjs/graphql";

@ObjectType({description: 'Product model'})
export class ProductModel {
    @Field(() => ID)
    id: string;

    @Field(() => String)
    name: string;

    @Field(() => String)
    price: string;

    @Field(() => String)
    description: string;

    @Field(() => GraphQLISODateTime)
    createdAt: Date;

    @Field(() => GraphQLISODateTime)
    updatedAt: Date;

}