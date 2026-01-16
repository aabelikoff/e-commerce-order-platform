import { registerAs } from '@nestjs/config';
import { IAppConfig } from './app.config.types';

export const appConfig = registerAs(
  'app',
  (): IAppConfig => ({
    port: parseInt(process.env.PORT as string, 10) || 3001,
    env: process.env.NODE_ENV || 'development',
  }),
);
