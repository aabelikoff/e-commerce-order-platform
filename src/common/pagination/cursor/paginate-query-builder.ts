import { SelectQueryBuilder } from 'typeorm';
import { CursorPaginationQueryDto } from 'src/common/dto/cursor-pagination-query.dto';
import { PaginationCursorMetaDto } from 'src/common/dto/pagination-cursor-meta.dto';
import { decodeCursor, encodeCursor } from './cursor-codec';

export interface CursorPaginatedResult<T> {
  items: T[];
  pagination: PaginationCursorMetaDto;
}

export async function paginateQueryBuilderByCursor<
  T extends { id: string; createdAt: Date },
>(
  queryBuilder: SelectQueryBuilder<T>,
  query: CursorPaginationQueryDto,
  alias: string,
): Promise<CursorPaginatedResult<T>> {
  const limit = query.limit ?? 10;
  const cursor = query.cursor;
  const mainAlias = queryBuilder.expressionMap.mainAlias;

  if (!mainAlias?.metadata) {
    throw new Error('Cursor pagination requires a query builder with metadata');
  }

  const createdAtColumn =
    mainAlias.metadata.findColumnWithPropertyName('createdAt');
  const idColumn = mainAlias.metadata.findColumnWithPropertyName('id');

  if (!createdAtColumn || !idColumn) {
    throw new Error('Cursor pagination requires id and createdAt columns');
  }

  const escapedAlias = queryBuilder.escape(alias);
  const escapedCreatedAtColumn = queryBuilder.escape(
    createdAtColumn.databaseName,
  );
  const escapedIdColumn = queryBuilder.escape(idColumn.databaseName);
  const createdAtExpr = `${escapedAlias}.${escapedCreatedAtColumn}`;
  const idExpr = `${escapedAlias}.${escapedIdColumn}`;
  const cursorCreatedAtSelectAlias = '__cursor_created_at';

  queryBuilder.addSelect(
    `TO_CHAR(${createdAtExpr} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
    cursorCreatedAtSelectAlias,
  );

  if (cursor) {
    const { id, createdAt } = decodeCursor(cursor);

    queryBuilder.andWhere(
      `(${createdAtExpr} < :cursorCreatedAt OR (${createdAtExpr} = :cursorCreatedAt AND ${idExpr} < :cursorId))`,
      {
        cursorCreatedAt: createdAt,
        cursorId: id,
      },
    );
  }

  const { entities, raw } = await queryBuilder
    .take(limit + 1)
    .getRawAndEntities();
  const hasNext = entities.length > limit;
  const pageItems = hasNext ? entities.slice(0, limit) : entities;
  const pageRaw = hasNext ? raw.slice(0, limit) : raw;
  const lastItem = pageItems.at(-1);
  const lastRaw = pageRaw.at(-1) as Record<string, unknown> | undefined;
  const exactCreatedAt =
    typeof lastRaw?.[cursorCreatedAtSelectAlias] === 'string'
      ? lastRaw[cursorCreatedAtSelectAlias]
      : lastItem?.createdAt.toISOString();

  return {
    items: pageItems,
    pagination: {
      hasNext,
      nextCursor: lastItem
        ? encodeCursor(
            lastItem.id,
            exactCreatedAt ?? lastItem.createdAt.toISOString(),
          )
        : null,
    },
  };
}
