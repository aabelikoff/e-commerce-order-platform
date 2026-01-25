import { CursorPaginationQueryDto } from 'src/common/dto/cursor-pagination-query.dto';
import { PaginationCursorMetaDto } from '../../dto/pagination-cursor-meta.dto';

export interface ICursorPayload {
  id: string;
  createdAt: string;
}

export interface ICursorPage<T> {
  items: T[];
  pagination: PaginationCursorMetaDto;
}

export const paginateByCursor = <T extends { id: string; createdAt: Date }>(
  query: CursorPaginationQueryDto,
  target: T[],
): ICursorPage<T> => {
  const limit = query.limit;
  const cursor = query.cursor;

  let startIndex = 0;

  if (cursor) {
    const payloadUnknown = safeDecodeBase64<unknown>(cursor);

    if (!payloadUnknown || !isCursorPayload(payloadUnknown)) {
      throw new Error('Invalid cursor payload');
    }

    const { id, createdAt } = payloadUnknown;

    const cursorIndex = target.findIndex(
      (v) =>
        v.id === id && v.createdAt.getTime() === new Date(createdAt).getTime(),
    );

    if (cursorIndex === -1) {
      throw new Error('Cursor not found in target');
    }

    startIndex = cursorIndex + 1;
  }

  const window = target.slice(startIndex, startIndex + limit + 1);
  const hasNext = window.length > limit;

  const items = hasNext ? window.slice(0, limit) : window;

  const lastItem = items.at(-1);
  const nextCursor =
    hasNext && lastItem
      ? encodeBase64({
          id: lastItem.id,
          createdAt: lastItem.createdAt.toISOString(),
        } satisfies ICursorPayload)
      : null;

  const pagination: PaginationCursorMetaDto = {
    nextCursor,
    hasNext,
  };

  return { items, pagination };
};

function encodeBase64(value: object): string {
  return Buffer.from(JSON.stringify(value), 'utf-8').toString('base64');
}

function decodeBase64<T>(cursor: string): T {
  return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
}

function safeDecodeBase64<T>(cursor: string): T | null {
  try {
    return decodeBase64<T>(cursor);
  } catch {
    return null;
  }
}

function isCursorPayload(value: unknown): value is ICursorPayload {
  if (typeof value !== 'object' || value === null) return false;

  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && typeof v.createdAt === 'string';
}
