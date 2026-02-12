import { InputType, Field, GraphQLISODateTime } from '@nestjs/graphql';
import { EOrderStatus } from '../enums/order-status.gql';
import { IsDate, IsEnum, IsOptional } from 'class-validator';

@InputType()
export class OrdersFilterInput {
  @IsOptional()
  @IsEnum(EOrderStatus)
  @Field(() => EOrderStatus, { nullable: true })
  status?: EOrderStatus;

  @IsOptional()
  @IsDate()
  @Field(() => GraphQLISODateTime, { nullable: true })
  dateFrom?: Date;

  @IsOptional()
  @IsDate()
  @Field({ nullable: true })
  dateTo?: Date;
}
