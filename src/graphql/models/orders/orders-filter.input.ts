import {
  ArgsType,
  Field,
  GraphQLISODateTime,
  InputType,
} from '@nestjs/graphql';
import { EOrderStatus } from '../enums/order-status.gql';
import { IsDate, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class OrdersFilterInput {
  @Field(() => EOrderStatus, { nullable: true })
  @IsOptional()
  @IsEnum(EOrderStatus)
  status?: EOrderStatus;

  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateFrom?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateTo?: Date;
}
