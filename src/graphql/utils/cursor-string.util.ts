interface CursorData {
  id: string;
  createdAt: string;
}

export const encodeCursor = (id: string, createdAt: string | Date): string =>
  Buffer.from(JSON.stringify({ id, createdAt })).toString('base64');

export const decodeCursor = (cursor: string): CursorData =>
  JSON.parse(Buffer.from(cursor, 'base64').toString());