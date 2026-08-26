import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

// Repo-root .env, loaded without a dependency (Node >= 20.12). Real
// environments inject variables directly and have no file here.
const envFile = join(process.cwd(), '../../.env');
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
} else if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

/**
 * Configuration is validated once at boot. A missing or placeholder secret is a
 * startup failure outside development rather than a runtime surprise in
 * production.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().default(4000),
  WEB_ORIGIN: z.string().url().default('http://localhost:5180'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().optional(),
  ACCESS_TOKEN_SECRET: z.string().min(32, 'ACCESS_TOKEN_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).default(30),
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((value) => value === 'true'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`);
  throw new Error(`Invalid API configuration:\n${issues.join('\n')}`);
}

export const config = parsed.data;

export const isProduction = config.NODE_ENV === 'production';

if (isProduction && config.ACCESS_TOKEN_SECRET.startsWith('change-me')) {
  throw new Error('ACCESS_TOKEN_SECRET still holds its example value — set a real secret.');
}

/**
 * Values in this list must never reach the browser. Kept explicit so a future
 * "just expose it in VITE_" shortcut has something to fail against.
 */
export const SERVER_ONLY_ENV_KEYS = [
  'DATABASE_URL',
  'ACCESS_TOKEN_SECRET',
  'PAYSTACK_SECRET_KEY',
  'PAYSTACK_WEBHOOK_SECRET',
  'SMTP_HOST',
  'S3_SECRET_ACCESS_KEY',
] as const;
