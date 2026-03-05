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

let config;
try {
    config = envSchema.parse(process.env);
} catch (error) {
    if (error instanceof z.ZodError) {
        console.error('❌ Invalid environment variables:', error.flatten().fieldErrors);
    } else {
        console.error('❌ Error parsing environment variables:', error);
    }
    // In a serverless environment, we still want to export something so the module doesn't totally fail
    // but the app should ideally not proceed if config is missing.
    // For Vercel, crashing here is actually okay as it shows in logs, but let's make it explicit.
    config = process.env;
}

module.exports = { config };
