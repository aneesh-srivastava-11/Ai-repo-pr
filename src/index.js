const express = require('express');
const { config } = require('./config');
const { logger } = require('./utils/logger');
const { webhookRouter } = require('./webhooks/router');

const app = express();

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
