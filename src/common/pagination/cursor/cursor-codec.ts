import { BadRequestException } from '@nestjs/common';

export interface CursorPayload {
  id: string;
  createdAt: string;
}

export const encodeCursor = (id: string, createdAt: string | Date): string =>
  Buffer.from(JSON.stringify({ id, createdAt })).toString('base64');

export const decodeCursor = (cursor: string): CursorPayload => {
  try {
    const payload = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));

    if (
      typeof payload !== 'object' ||
      payload === null ||
      typeof payload.id !== 'string' ||
      typeof payload.createdAt !== 'string'
    ) {
      throw new Error('Invalid cursor shape');
    }

    return payload as CursorPayload;
  } catch {
    throw new BadRequestException('Invalid cursor');
  }
};
