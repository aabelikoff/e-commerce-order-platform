import { registerAs } from '@nestjs/config';
import { IAuthConfig } from './auth.config.types';

export const authConfig = registerAs(
  'auth',
  (): IAuthConfig => ({
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    jwtRefreshTtl: process.env.JWT_REFRESH_TTl ?? '30d',
  }),
);
