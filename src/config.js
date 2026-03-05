require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
    PORT: z.string().default('3000'),
    DATABASE_URL: z.string(),
    GITHUB_APP_ID: z.string(),
    GITHUB_WEBHOOK_SECRET: z.string(),
    GITHUB_PRIVATE_KEY: z.string(),
    GEMINI_API_KEY: z.string(),
});

const config = envSchema.parse(process.env);

module.exports = { config };
