const { getPullRequestDiff } = require('../github/diff');
const { calculateHeuristicRisk } = require('../risk/heuristics');
const { analyzeDiffWithAI } = require('../llm/gemini');
const { createCheckRun, updateCheckRun } = require('../github/checks');
const { prisma } = require('../db/prisma');
const { logger } = require('../utils/logger');

async function runAnalysis(octokit, payload) {
    const { pull_request: pr, repository: repo } = payload;
    const owner = repo.owner.login;
    const repoName = repo.name;
    const headSha = pr.head ? pr.head.sha : (payload.check_suite ? payload.check_suite.head_sha : null);

    if (!headSha) {
        logger.error({ pr: pr.number }, 'No head SHA found for analysis');
        return;
    }

    logger.info({ pr: pr.number, repo: repo.full_name, sha: headSha }, 'Starting PR analysis');

    // 1. Create Initial Check Run (In Progress)
    let check;
    try {
        check = await createCheckRun(octokit, {
            owner,
            repo: repoName,
            head_sha: headSha,
            name: 'AI Risk Analyzer',
            status: 'in_progress',
        });
        logger.info({ checkId: check.id }, 'Created initial check run');
    } catch (error) {
        logger.error({ error }, 'Failed to create initial check run');
        return;
    }

    try {
        // 2. Fetch Diff
        logger.info('Fetching PR diff from GitHub');
        const { files, diff } = await getPullRequestDiff(octokit, {
            owner,
            repo: repoName,
            pull_number: pr.number,
        });

        if (!diff || files.length === 0) {
            logger.info('No changes found in PR, skipping AI analysis');
            await updateCheckRun(octokit, {
                owner,
                repo: repoName,
                check_run_id: check.id,
                status: 'completed',
                conclusion: 'success',
                output: {
                    title: 'No Changes Detected',
                    summary: 'This PR appears to have no files changed or is empty.',
                },
            });
            return;
        }

        // 3. Filter generated files
        const filteredFiles = files.filter(f => {
            const isMap = f.filename.endsWith('.map');
            const isLock = f.filename.includes('pnpm-lock') || f.filename.includes('package-lock.json');
            const isDist = f.filename.startsWith('dist/') || f.filename.startsWith('build/') || f.filename.includes('node_modules/');
            return !isMap && !isLock && !isDist;
        });

        // 4. Heuristics Analysis
        logger.info({ fileCount: filteredFiles.length }, 'Running heuristics analysis');
        const heuristics = calculateHeuristicRisk(filteredFiles, diff);

        // 5. AI Analysis
        logger.info('Calling Gemini AI for diff analysis');
        const aiResult = await analyzeDiffWithAI(diff, filteredFiles);

        // 6. Combine Results
        logger.info({ aiScore: aiResult.riskScore, heuristicScore: heuristics.score }, 'Combining results');
        const finalRiskScore = Math.max(heuristics.score, aiResult.riskScore);
        const allReasons = [...new Set([...heuristics.reasons, ...aiResult.reasons])];

        let conclusion = 'neutral';
        let title = 'SAFE TO MERGE';
        let summaryText = aiResult.summary;

        if (finalRiskScore >= 8) {
            conclusion = 'failure';
            title = 'BLOCK - HIGH RISK';
        } else if (finalRiskScore >= 4) {
            conclusion = 'neutral';
            title = 'REVIEW REQUIRED - MEDIUM RISK';
        } else {
            conclusion = 'success';
        }

        // 7. Store in DB
        logger.info('Storing analysis results in database');
        try {
            await prisma.analysis.upsert({
                where: {
                    pullRequestId_commitSha: {
                        pullRequestId: pr.id,
                        commitSha: headSha,
                    },
                },
                update: {
                    riskScore: finalRiskScore,
                    summary: summaryText,
                    reasons: allReasons,
                    checklist: aiResult.reviewChecklist,
                },
                create: {
                    pullRequestId: pr.id,
                    commitSha: headSha,
                    riskScore: finalRiskScore,
                    summary: summaryText,
                    reasons: allReasons,
                    checklist: aiResult.reviewChecklist,
                },
            });
        } catch (dbError) {
            logger.warn({ dbError }, 'Failed to store analysis in database, proceeding to update GitHub check');
        }

        // 8. Update Check Run
        logger.info('Updating GitHub Check Run with final results');
        await updateCheckRun(octokit, {
            owner,
            repo: repoName,
            check_run_id: check.id,
            status: 'completed',
            conclusion,
            output: {
                title,
                summary: summaryText,
                text: `
### Risk Factors
${allReasons.map(r => `- ${r}`).join('\n')}

### Recommended Review Checklist
${aiResult.reviewChecklist.map(c => `- [ ] ${c}`).join('\n')}

**Heuristic Score:** ${heuristics.score}/10
**AI Score:** ${aiResult.riskScore}/10
        `,
            },
        });

        logger.info({ pr: pr.number, score: finalRiskScore }, 'Analysis completed');
    } catch (error) {
        logger.error({ error, pr: pr.number }, 'Analysis failed');
        await updateCheckRun(octokit, {
            owner,
            repo: repoName,
            check_run_id: check.id,
            status: 'completed',
            conclusion: 'neutral',
            output: {
                title: 'Analysis Error',
                summary: 'Something went wrong during the analysis.',
                text: `Error details: ${error.message}`,
            },
        });
    }
}

module.exports = {
    runAnalysis,
};
