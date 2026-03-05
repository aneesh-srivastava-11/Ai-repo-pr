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

        // 3. Kick off analysis (don't await to avoid webhook timeout)
        runAnalysis(octokit, payload).catch(err => {
            logger.error({ err, pr: pr.number }, 'Background analysis failed');
        });
    }

    return { success: true };
}

module.exports = {
    handlePullRequest,
};
