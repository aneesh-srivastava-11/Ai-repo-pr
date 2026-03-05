const express = require('express');
const { verifySignature } = require('./verify');
const { handlePullRequest } = require('./handler');
const { logger } = require('../utils/logger');

const router = express.Router();

router.post('/', verifySignature, async (req, res) => {
    const event = req.headers['x-github-event'];
    const deliveryId = req.headers['x-github-delivery'];

    logger.info({ event, deliveryId }, 'Received GitHub delivery');

    try {
        if (event === 'pull_request') {
            await handlePullRequest(req.body);
        } else if (event === 'ping') {
            return res.status(200).send('PONG');
        } else {
            logger.debug({ event }, 'Ignored event');
        }

        res.status(202).json({ message: 'Accepted' });
    } catch (error) {
        logger.error({ error, deliveryId }, 'Error processing webhook');
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = { webhookRouter: router };
