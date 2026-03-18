import { Field, ObjectType, Int } from '@nestjs/graphql';
import { Type } from '@nestjs/common';
import { PageInfo } from '../models/common/page-info.model';

export interface IPaginatedType<T> {
  nodes: T[];
  totalCount: number;
  pageInfo: PageInfo;
}

export function CreatePaginatedType<T>(
  classRef: Type<T>,
  nullable: boolean,
): Type<IPaginatedType<T>> {
  @ObjectType({ isAbstract: true })
  abstract class PaginatedType implements IPaginatedType<T> {
    @Field(() => [classRef], { nullable })
    nodes: T[];

    @Field(() => Int)
    totalCount: number;

    @Field(() => PageInfo)
    pageInfo: PageInfo;
  }
  return PaginatedType as Type<IPaginatedType<T>>;
}
