const { App } = require('@octokit/app');
const { config } = require('../config');

const app = new App({
    appId: config.GITHUB_APP_ID,
    privateKey: config.GITHUB_PRIVATE_KEY,
    webhooks: {
        secret: config.GITHUB_WEBHOOK_SECRET,
    },
});

/**
 * Gets an Octokit instance for a specific installation
 * @param {number} installationId 
 */
async function getInstallationOctokit(installationId) {
    return await app.getInstallationOctokit(installationId);
}

module.exports = {
    app,
    getInstallationOctokit,
};
