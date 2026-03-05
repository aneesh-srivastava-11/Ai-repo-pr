const { prisma } = require('../db/prisma');
const { runAnalysis } = require('../analyzer/orchestrator');
const { getInstallationOctokit } = require('../github/auth');
const { logger } = require('../utils/logger');

async function handlePullRequest(payload) {
    const { action, pull_request: pr, repository: repo, installation } = payload;

    logger.info({ action, pr: pr.number, repo: repo.full_name }, 'Handling PR event');

    if (['opened', 'synchronize', 'reopened'].includes(action)) {
        // 1. Ensure Repo and PR exist in DB
        await prisma.repository.upsert({
            where: { id: repo.id },
            update: {
                name: repo.name,
                fullName: repo.full_name,
                owner: repo.owner.login,
                installation: installation.id,
            },
            create: {
                id: repo.id,
                name: repo.name,
                fullName: repo.full_name,
                owner: repo.owner.login,
                installation: installation.id,
            },
        });

        await prisma.pullRequest.upsert({
            where: { id: pr.id },
            update: {
                number: pr.number,
                title: pr.title,
                state: pr.state,
                headSha: pr.head.sha,
                repositoryId: repo.id,
            },
            create: {
                id: pr.id,
                number: pr.number,
                title: pr.title,
                state: pr.state,
                headSha: pr.head.sha,
                repositoryId: repo.id,
            },
        });

        // 2. Get Octokit instance for this installation
        const octokit = await getInstallationOctokit(installation.id);

        // 3. Kick off analysis (AWAIT for Vercel persistence)
        let analysisPayload = payload;

        // If it's a check_suite event, we need to extract the PR
        if (payload.check_suite && payload.check_suite.pull_requests && payload.check_suite.pull_requests.length > 0) {
            analysisPayload = {
                ...payload,
                pull_request: payload.check_suite.pull_requests[0]
            };
        }

        if (analysisPayload.pull_request) {
            await runAnalysis(octokit, analysisPayload);
        } else {
            logger.info('No pull request found in payload, skipping analysis');
        }
    }

    return { success: true };
}

module.exports = {
    handlePullRequest,
};
