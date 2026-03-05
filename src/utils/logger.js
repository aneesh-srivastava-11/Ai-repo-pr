const pino = require('pino');

const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: !isProduction ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
        },
    } : undefined,
});

module.exports = { logger };
