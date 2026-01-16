import { registerAs } from '@nestjs/config';
import { IDatabaseConfig } from './database.config.types';

export const databaseConfig = registerAs('database', (): IDatabaseConfig => ({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT as string, 10) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    name: process.env.DB_NAME || 'ecommerce',
}));