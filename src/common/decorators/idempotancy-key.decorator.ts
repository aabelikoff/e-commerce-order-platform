import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { validate as uuidValidate, version as uuidVersion } from 'uuid';

export const IdempotencyKey = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const headerValue = req.headers['idempotency-key'];
    const value = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (!value) {
      throw new BadRequestException('Missing Idempotency-Key header');
    }

    if (!uuidValidate(value) || uuidVersion(value) !== 4) {
      throw new BadRequestException(
        'Invalid Idempotency-Key (uuid v4 expected)',
      );
    }

    return value;
  },
);
