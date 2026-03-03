import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
    PORT: z.string().default('3000'),
    DATABASE_URL: z.string(),
    GITHUB_APP_ID: z.string(),
    GITHUB_WEBHOOK_SECRET: z.string(),
    GITHUB_PRIVATE_KEY: z.string(),
    GEMINI_API_KEY: z.string(),
});

export const config = envSchema.parse(process.env);
