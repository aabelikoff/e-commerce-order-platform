import { registerAs } from '@nestjs/config';
import { IThrottlingConfig } from './throttling.config.types';

function toPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const throttlingConfig = registerAs(
  'throttling',
  (): IThrottlingConfig => ({
    default: {
      ttl: toPositiveInt(process.env.THROTTLE_DEFAULT_TTL_MS, 60_000),
      limit: toPositiveInt(process.env.THROTTLE_DEFAULT_LIMIT, 100),
    },
    auth: {
      ttl: toPositiveInt(process.env.THROTTLE_AUTH_TTL_MS, 60_000),
      limit: toPositiveInt(process.env.THROTTLE_AUTH_LIMIT, 5),
    },
    payments: {
      ttl: toPositiveInt(process.env.THROTTLE_PAYMENTS_TTL_MS, 60_000),
      limit: toPositiveInt(process.env.THROTTLE_PAYMENTS_LIMIT, 5),
    },
    adminWrites: {
      ttl: toPositiveInt(process.env.THROTTLE_ADMIN_WRITES_TTL_MS, 60_000),
      limit: toPositiveInt(process.env.THROTTLE_ADMIN_WRITES_LIMIT, 10),
    },
  }),
);
