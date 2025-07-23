import { z } from 'zod';

const envSchema = z.object({
  MONGO_URI: z.string(),
  REDIS_URL: z.string(),
  SESSION_SECRET: z.string(),
  NODE_ENV: z.enum(['development', 'production']),
});

export const env = envSchema.parse(process.env);
