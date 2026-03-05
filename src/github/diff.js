const { logger } = require('../utils/logger');

/**
 * Fetches the PR diff and changed files
 */
async function getPullRequestDiff(octokit, { owner, repo, pull_number }) {
    try {
        // Get list of files
        const { data: files } = await octokit.rest.pulls.listFiles({
            owner,
            repo,
            pull_number,
        });

        // Get the actual diff text
        const { data: diff } = await octokit.rest.pulls.get({
            owner,
            repo,
            pull_number,
            mediaType: {
                format: 'diff',
            },
        });

        return { files, diff };
    } catch (error) {
        logger.error({ error, pull_number }, 'Error fetching PR diff');
        throw error;
    }
}

module.exports = {
    getPullRequestDiff,
};
