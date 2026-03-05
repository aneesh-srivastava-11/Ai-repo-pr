const crypto = require('crypto');
const { config } = require('../config');
const { logger } = require('../utils/logger');

/**
 * Middleware to verify GitHub Webhook HMAC signature
 */
function verifySignature(req, res, next) {
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
        logger.warn('Missing x-hub-signature-256 header');
        return res.status(401).send('Signature missing');
    }

    const hmac = crypto.createHmac('sha256', config.GITHUB_WEBHOOK_SECRET);
    // GitHub sends the raw body as a buffer if you use express.raw() or express.json({ verify })
    const digest = 'sha256=' + hmac.update(req.rawBody).digest('hex');

    if (signature !== digest) {
        logger.error({ signature, digest }, 'Invalid signature');
        return res.status(401).send('Invalid signature');
    }

    next();
}

module.exports = { verifySignature };
