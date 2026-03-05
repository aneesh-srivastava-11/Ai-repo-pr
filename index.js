const express = require('express');
const { config } = require('./src/config');
const { logger } = require('./src/utils/logger');
const { webhookRouter } = require('./src/webhooks/router');

const app = express();

// Root handler to prevent 404/500 on base URL
app.get('/', (req, res) => {
    const diagnostics = {
        status: 'AI PR Risk Analyzer is running!',
        env: {
            nodeEnv: process.env.NODE_ENV,
            hasAppId: !!config.GITHUB_APP_ID,
            hasPrivateKey: !!config.GITHUB_PRIVATE_KEY,
            hasWebhookSecret: !!config.GITHUB_WEBHOOK_SECRET,
            hasGeminiKey: !!config.GEMINI_API_KEY,
            hasDatabaseUrl: !!config.DATABASE_URL
        }
    };
    res.status(200).json(diagnostics);
});

// Middleware to capture raw body for signature verification
app.use(express.json({
    verify: (req, _res, buf) => {
        req.rawBody = buf;
    },
}));

// Routes
app.use('/webhooks', webhookRouter);

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' });
});

// Start server (only if not running as a serverless function)
if (require.main === module) {
    const PORT = config.PORT || 3000;
    app.listen(PORT, () => {
        logger.info(`AI PR Risk Analyzer listening on port ${PORT}`);
        logger.info(`Webhook endpoint: http://localhost:${PORT}/webhooks`);
    });
}

module.exports = app;
