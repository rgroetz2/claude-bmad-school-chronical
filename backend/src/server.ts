import './config/env'; // load env first
import app from './app';
import { env } from './config/env';
import { db } from './config/db';
import { redis } from './config/redis';

async function bootstrap(): Promise<void> {
  // Verify DB connection
  try {
    await db.query('SELECT 1');
    console.log('[DB] Connected to PostgreSQL');
  } catch (err) {
    console.error('[DB] Failed to connect:', (err as Error).message);
    process.exit(1);
  }

  // Connect Redis
  try {
    await redis.connect();
    console.log('[Redis] Connected');
  } catch (err) {
    console.error('[Redis] Failed to connect:', (err as Error).message);
    process.exit(1);
  }

  app.listen(env.port, () => {
    console.log(`[Server] SchoolCronicle API running on port ${env.port}`);
    console.log(`[Server] Environment: ${env.nodeEnv}`);
  });
}

bootstrap();
