const { prisma } = require('../db/prisma');
const { runAnalysis } = require('../analyzer/orchestrator');
const { getInstallationOctokit } = require('../github/auth');
const { logger } = require('../utils/logger');

async function handlePullRequest(payload) {
    const { action, repository: repo, installation } = payload;

    // Normalize pull_request object from either 'pull_request' or 'check_suite' events
    let pr = payload.pull_request;

    if (!pr && payload.check_suite && payload.check_suite.pull_requests && payload.check_suite.pull_requests.length > 0) {
        pr = payload.check_suite.pull_requests[0];
    }

    if (!pr) {
        logger.info({ action, event: payload.check_suite ? 'check_suite' : 'unknown' }, 'No pull request found in payload, skipping');
        return { success: true };
    }

    logger.info({ action, pr: pr.number, repo: repo.full_name }, 'Handling event for PR');

    // Trigger analysis for PR opened/sync OR check_suite requested/rerequested
    const isPrAction = ['opened', 'synchronize', 'reopened'].includes(action);
    const isCheckAction = ['requested', 'rerequested'].includes(action);

    if (isPrAction || isCheckAction) {
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

        // For check_suite events, the PR object might be partial, but we need the ID
        await prisma.pullRequest.upsert({
            where: { id: pr.id },
            update: {
                number: pr.number,
                state: pr.state || 'open',
                headSha: pr.head ? pr.head.sha : (payload.check_suite ? payload.check_suite.head_sha : ''),
                repositoryId: repo.id,
            },
            create: {
                id: pr.id,
                number: pr.number,
                title: pr.title || `PR #${pr.number}`,
                state: pr.state || 'open',
                headSha: pr.head ? pr.head.sha : (payload.check_suite ? payload.check_suite.head_sha : ''),
                repositoryId: repo.id,
            },
        });

        // 2. Get Octokit instance for this installation
        const octokit = await getInstallationOctokit(installation.id);

        // 3. Kick off analysis (AWAIT for Vercel persistence)
        // Ensure we pass a normalized payload to runAnalysis
        const analysisPayload = {
            ...payload,
            pull_request: pr
        };

        if (analysisPayload.pull_request.head || (payload.check_suite && payload.check_suite.head_sha)) {
            // Ensure headSha is available for orchestrator
            if (!analysisPayload.pull_request.head && payload.check_suite) {
                analysisPayload.pull_request.head = { sha: payload.check_suite.head_sha };
            }
            await runAnalysis(octokit, analysisPayload);
        } else {
            logger.error('Could not determine head SHA for analysis');
        }
    }

    return { success: true };
}

module.exports = {
    handlePullRequest,
};
