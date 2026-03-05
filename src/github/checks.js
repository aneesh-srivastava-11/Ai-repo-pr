const { logger } = require('../utils/logger');

/**
 * Creates or updates a GitHub Check Run
 * @param {import('@octokit/core').Octokit} octokit 
 * @param {object} params 
 */
async function createCheckRun(octokit, { owner, repo, head_sha, name, status, conclusion, output }) {
    try {
        const response = await octokit.request('POST /repos/{owner}/{repo}/check-runs', {
            owner,
            repo,
            name,
            head_sha,
            status,
            conclusion,
            output,
        });
        return response.data;
    } catch (error) {
        logger.error({ error, head_sha }, 'Error creating check run');
        throw error;
    }
}

/**
 * Updates an existing GitHub Check Run
 */
async function updateCheckRun(octokit, { owner, repo, check_run_id, status, conclusion, output }) {
    try {
        const response = await octokit.request('PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}', {
            owner,
            repo,
            check_run_id,
            status,
            conclusion,
            output,
        });
        return response.data;
    } catch (error) {
        logger.error({ error, check_run_id }, 'Error updating check run');
        throw error;
    }
}

module.exports = {
    createCheckRun,
    updateCheckRun,
};
