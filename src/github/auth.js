const { App } = require('@octokit/app');
const { config } = require('../config');
const { logger } = require('../utils/logger');

let appInstance = null;

/**
 * Lazy initialization of the GitHub App instance to prevent startup crashes
 */
function getGitHubApp() {
    if (appInstance) return appInstance;

    try {
        if (!config.GITHUB_APP_ID || !config.GITHUB_PRIVATE_KEY) {
            throw new Error('Missing GitHub App credentials');
        }

        appInstance = new App({
            appId: config.GITHUB_APP_ID,
            privateKey: config.GITHUB_PRIVATE_KEY,
            webhooks: {
                secret: config.GITHUB_WEBHOOK_SECRET || '',
            },
        });
        return appInstance;
    } catch (error) {
        logger.error('Failed to initialize GitHub App:', error.message);
        return null;
    }
}

/**
 * Gets an Octokit instance for a specific installation
 * @param {number} installationId 
 */
async function getInstallationOctokit(installationId) {
    const app = getGitHubApp();
    if (!app) throw new Error('GitHub App not initialized');
    return await app.getInstallationOctokit(installationId);
}

module.exports = {
    getGitHubApp,
    getInstallationOctokit,
};
