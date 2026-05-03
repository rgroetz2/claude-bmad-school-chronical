import * as fs from 'fs';
import * as path from 'path';

/** Load .env.local then .env — later file wins on conflicts */
function loadEnv(): void {
  const files = ['.env', '.env.local']; // .env.local overrides .env
  for (const file of files) {
    const filePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!(key in process.env)) process.env[key] = val; // don't override already-set env
    }
  }
}

loadEnv();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function optionalNumber(key: string, fallback: number): number {
  const val = process.env[key];
  return val ? parseInt(val, 10) : fallback;
}

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: optionalNumber('PORT', 3000),
  frontendUrl: optional('FRONTEND_URL', 'http://localhost:4200'),
  corsOrigin: optional('CORS_ORIGIN', 'http://localhost:4200'),

  db: {
    host: optional('DB_HOST', 'localhost'),
    port: optionalNumber('DB_PORT', 5432),
    user: optional('DB_USER', 'schoolchronicle'),
    password: optional('DB_PASSWORD', 'schoolchronicle'),
    name: optional('DB_NAME', 'schoolchronicle'),
  },

  redis: {
    host: optional('REDIS_HOST', 'localhost'),
    port: optionalNumber('REDIS_PORT', 6379),
    password: process.env['REDIS_PASSWORD'],
  },

  jwt: {
    secret: optional('JWT_SECRET', 'dev-secret-change-me-in-production'),
    privateKey: process.env['JWT_PRIVATE_KEY'],
    publicKey: process.env['JWT_PUBLIC_KEY'],
    accessTokenExpiry: optional('JWT_ACCESS_TOKEN_EXPIRY', '15m'),
    refreshTokenTtlSeconds: 7 * 24 * 60 * 60, // 7 days
  },

  smtp: {
    host: optional('SMTP_HOST', 'localhost'),
    port: optionalNumber('SMTP_PORT', 1025),
    secure: optional('SMTP_SECURE', 'false') === 'true',
    user: process.env['SMTP_USER'],
    pass: process.env['SMTP_PASS'],
    from: optional('SMTP_FROM', '"SchoolCronicle" <noreply@schoolchronicle.local>'),
  },
} as const;
