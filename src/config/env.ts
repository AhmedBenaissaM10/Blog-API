import { z } from 'zod';
import dotenv from 'dotenv';
import logger from '../utils/logger';
dotenv.config();

const EnvSchema = z.object({
  PORT: z.coerce.number().default(4000),
  ACCESS_TOKEN: z.string().min(20, "Access Token should be longer than 20 caracters").default("your_acess_jwt_secret_key"),
  REFRESH_TOKEN: z.string().min(20, "Refresh Token should be longer than 20 caracters").default("your_refresh_jwt_secret_key"),
  DATABASE_URL: z.string(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const result = EnvSchema.safeParse(process.env);

if (!result.success) {
  logger.error("Environment variable validation failed:", result.error.format());
  process.exit(1);
}
logger.info("✅ Environment variables validated.");

export const env = result.data;