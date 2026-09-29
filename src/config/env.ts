import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config({ quiet: process.env.NODE_ENV === 'test' });
import logger from '@utils/logger';

const EnvSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.url().default('http://localhost:5173'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  REFRESH_TOKEN_SECRET: z.string().min(1, 'REFRESH_TOKEN_SECRET is required'),
  ACCESS_TOKEN_SECRET: z.string().min(1, 'ACCESS_TOKEN_SECRET is required'),
  EMAIL_USER: z.email().min(1, 'EMAIL_USER is required'),
  EMAIL_PASSWORD: z.string().min(1, 'EMAIL_PASSWORD is required'),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_CALLBACK_URL: z.string(),
});

const result = EnvSchema.safeParse(process.env);

if (!result.success) {
  logger.error('Environment variable validation failed:', result.error.format());
  process.exit(1);
}
logger.info('✅ Environment variables validated.');

export const env = result.data;
