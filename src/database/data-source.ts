import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { join, resolve } from 'path';
import { getEnvFilePath } from '../config/env/env-path.config';
import { SeederOptions } from 'typeorm-extension';

config({ path: resolve(process.cwd(), getEnvFilePath()) });

const seedsGlob = join(__dirname, 'seeds', '**', '*.seeder{.ts,.js}').replace(
  /\\/g,
  '/',
);
const migrationsGlob = join(__dirname, 'migrations', '*{.ts,.js}').replace(
  /\\/g,
  '/',
);
const entitiesGlob = join(__dirname, '..', '**', '*.entity{.ts,.js}').replace(
  /\\/g,
  '/',
);

const options: DataSourceOptions & SeederOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [entitiesGlob],
  migrations: [migrationsGlob],
  seeds: [seedsGlob],
  synchronize: false,
  seedTracking: true,
};

export const AppDataSource = new DataSource(options);
