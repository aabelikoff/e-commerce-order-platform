import { ArgsType, Field } from '@nestjs/graphql';
import { PaginationCursorInput } from '../common/pagination-cursor.input';
import { OrdersFilterInput } from './orders-filter.input';
import { ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

@ArgsType()
export class OrdersQueryArgs {
  @Field(() => OrdersFilterInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrdersFilterInput)
  filter?: OrdersFilterInput;

  @Field(() => PaginationCursorInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaginationCursorInput)
  pagination?: PaginationCursorInput;
}
