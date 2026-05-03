import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// Load .env.local for local dev, .env for production
config({ path: path.resolve(__dirname, '..', '.env.local') });
config({ path: path.resolve(__dirname, '..', '.env') });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'schoolchronicle',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'schoolchronicle',
  entities: [path.join(__dirname, 'entities', '*.entity.{ts,js}')],
  migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
