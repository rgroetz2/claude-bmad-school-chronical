import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis({
  host: env.redis.host,
  port: env.redis.port,
  password: env.redis.password,
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

// Key helpers
export const refreshTokenKey = (userId: string, tokenId: string): string =>
  `refresh:${userId}:${tokenId}`;

export const userRefreshPattern = (userId: string): string =>
  `refresh:${userId}:*`;
