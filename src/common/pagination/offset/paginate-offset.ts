import { OffsetPaginationQueryDto } from 'src/common/dto/offset-pagination-query.dto';

export interface IOffsetPage<T> {
  items: T[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export const paginateOffset = <T>(
  query: OffsetPaginationQueryDto,
  target: T[],
): IOffsetPage<T> => {
  const { limit, page } = query;
  const offset = (page - 1) * limit;
  const items = target.slice(offset, offset + limit);
  const total = target.length;

  return {
    items,
    pagination: {
      limit,
      offset,
      total,
    },
  };
};
