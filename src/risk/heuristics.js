/**
 * Calculates a risk score based on heuristics
 */
function calculateHeuristicRisk(files, diff) {
    let score = 0;
    const reasons = [];

    const criticalPaths = ['config/', 'auth/', 'core/', 'db/', 'security/'];
    const sensitiveFiles = ['.env', 'package.json', 'prisma/schema.prisma', 'docker-compose.yml'];

    const changedFiles = files.map(f => f.filename);

    // 1. Critical directories
    const hitsCriticalDir = changedFiles.some(f => criticalPaths.some(p => f.startsWith(p)));
    if (hitsCriticalDir) {
        score += 3;
        reasons.push('Changes to critical system directories (config, auth, core, db)');
    }

    // 2. Sensitive files
    const hitsSensitiveFile = changedFiles.some(f => sensitiveFiles.includes(f));
    if (hitsSensitiveFile) {
        score += 2;
        reasons.push('Modification of sensitive configuration files (.env, package.json, schema)');
    }

    // 3. Large diff
    const totalLines = files.reduce((acc, f) => acc + f.changes, 0);
    if (totalLines > 500) {
        score += 3;
        reasons.push(`Large diff detected: ${totalLines} lines changed`);
    }

    // 4. High deletion ratio
    const additions = files.reduce((acc, f) => acc + f.additions, 0);
    const deletions = files.reduce((acc, f) => acc + f.deletions, 0);
    if (deletions > additions && deletions > 100) {
        score += 2;
        reasons.push('High deletion-to-addition ratio in a large change');
    }

    // 5. Missing tests
    const hasTests = changedFiles.some(f => f.includes('.test.') || f.includes('.spec.') || f.startsWith('tests/'));
    const hasLogicChanges = changedFiles.some(f => f.endsWith('.js') || f.endsWith('.ts'));
    if (hasLogicChanges && !hasTests) {
        score += 2;
        reasons.push('Logic changes detected without accompanying tests');
    }

    return {
        score: Math.min(score, 10),
        reasons,
    };
}

module.exports = {
    calculateHeuristicRisk,
};
