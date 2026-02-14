import { InputType, Field, GraphQLISODateTime } from '@nestjs/graphql';
import { EOrderStatus } from '../enums/order-status.gql';
import { IsDate, IsEnum, IsOptional } from 'class-validator';

@InputType({
  description: 'Filtering options for querying orders',
})
export class OrdersFilterInput {
  @IsOptional()
  @IsEnum(EOrderStatus)
  @Field(() => EOrderStatus, {
    nullable: true,
    description: 'Filter orders by status (PENDING, PAID, SHIPPED,CANCELLED)',
  })
  status?: EOrderStatus;

  @IsOptional()
  @IsDate()
  @Field(() => GraphQLISODateTime, {
    nullable: true,
    description: 'Return orders created on or after this date (inclusive)',
  })
  dateFrom?: Date;

  @IsOptional()
  @IsDate()
  @Field(() => GraphQLISODateTime, {
    nullable: true,
    description: 'Return orders created on or before this date (inclusive)',
  })
  dateTo?: Date;
}
