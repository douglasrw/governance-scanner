function getGrade(score) {
    if (score >= 80)
        return "A";
    if (score >= 60)
        return "B";
    if (score >= 40)
        return "C";
    if (score >= 20)
        return "D";
    return "F";
}
function getEuAiActReadiness(score) {
    if (score >= 70)
        return "On track";
    if (score >= 40)
        return "Gaps identified";
    return "Not ready";
}
export function isCommittedEnvFile(filePath) {
    const name = filePath.split("/").pop() || "";
    return /\.env($|\.)/.test(name) && !/\.env\.(example|sample|template|dist)$/i.test(name);
}
export function parseGithubUrl(url) {
    // Handle shorthand owner/repo format (with optional .git suffix)
    const shorthand = url.match(/^([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+?)(?:\.git)?$/);
    if (shorthand) {
        return { owner: shorthand[1], repo: shorthand[2] };
    }
    // Handle SSH remote format: git@github.com:owner/repo.git
    const sshMatch = url
        .trim()
        .match(/^git@github\.com:([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+?)(?:\.git)?$/);
    if (sshMatch) {
        return { owner: sshMatch[1], repo: sshMatch[2] };
    }
    // Handle scheme-less github.com/owner/repo
    let normalized = url.trim();
    if (/^github\.com\//i.test(normalized)) {
        normalized = `https://${normalized}`;
    }
    try {
        const parsed = new URL(normalized);
        if (parsed.hostname !== "github.com")
            return null;
        const parts = parsed.pathname.split("/").filter(Boolean);
        if (parts.length < 2)
            return null;
        return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") };
    }
    catch {
        return null;
    }
}
async function githubFetch(path, timeoutMs = 15000) {
    const headers = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "governance-scanner-cli",
    };
    const token = process.env.GITHUB_TOKEN;
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(`https://api.github.com${path}`, {
            headers,
            signal: controller.signal,
        });
        if (!res.ok) {
            if (res.status === 404)
                throw new Error("REPO_NOT_FOUND");
            if (res.status === 403) {
                const remaining = res.headers.get("x-ratelimit-remaining");
                if (remaining === "0")
                    throw new Error("RATE_LIMITED");
                throw new Error("PRIVATE_REPO");
            }
            if (res.status === 401)
                throw new Error("PRIVATE_REPO");
            throw new Error(`GitHub API error: ${res.status}`);
        }
        return res.json();
    }
    finally {
        clearTimeout(timeout);
    }
}
export const TEST_CONFIG_FILES = [
    "pytest.ini",
    "pyproject.toml",
    "setup.cfg",
    "jest.config.js",
    "jest.config.ts",
    "vitest.config.ts",
    "vitest.config.js",
    ".nycrc",
    "karma.conf.js",
    "cypress.config.ts",
    "cypress.config.js",
    "playwright.config.ts",
    "playwright.config.js",
];
export async function scanRepo(repoUrl) {
    const parsed = parseGithubUrl(repoUrl);
    if (!parsed)
        throw new Error("INVALID_URL");
    const { owner, repo } = parsed;
    // Get repo metadata
    const repoData = await githubFetch(`/repos/${owner}/${repo}`);
    if (repoData.private)
        throw new Error("PRIVATE_REPO");
    const defaultBranch = repoData.default_branch || "main";
    // Get file tree (recursive). Handles truncation gracefully.
    const tree = await githubFetch(`/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`);
    const files = new Set();
    const dirs = new Set();
    for (const item of tree.tree || []) {
        if (item.type === "blob")
            files.add(item.path);
        if (item.type === "tree")
            dirs.add(item.path);
    }
    const dimensions = [];
    const findings = [];
    // 1. Enforcement hooks (30 pts)
    let enforcementScore = 0;
    const hasPreCommit = files.has(".pre-commit-config.yaml") ||
        files.has(".pre-commit-config.yml");
    const hasHusky = dirs.has(".husky");
    const hasLefthook = files.has("lefthook.yml") ||
        files.has("lefthook.yaml") ||
        files.has(".lefthook.yml") ||
        files.has(".lefthook.yaml");
    if (hasPreCommit || hasHusky || hasLefthook) {
        enforcementScore += 15;
        findings.push({
            severity: "positive",
            title: "Git hooks configured",
            description: "Pre-commit or commit hooks enforce rules automatically.",
        });
    }
    else {
        findings.push({
            severity: "critical",
            title: "No enforcement hooks",
            description: "No pre-commit hooks, Husky, or lefthook found. Rules are not structurally enforced.",
        });
    }
    const hasCommitLint = Array.from(files).some((f) => f.includes("commitlint") || f === ".husky/commit-msg");
    if (hasCommitLint)
        enforcementScore += 5;
    const hasCodeowners = files.has("CODEOWNERS") ||
        files.has(".github/CODEOWNERS") ||
        files.has("docs/CODEOWNERS");
    if (hasCodeowners)
        enforcementScore += 5;
    const hasBranchRules = files.has(".github/settings.yml") ||
        files.has(".github/branch-protection-rules.yml");
    if (hasBranchRules)
        enforcementScore += 5;
    dimensions.push({
        name: "Enforcement",
        score: Math.min(enforcementScore, 30),
        maxScore: 30,
    });
    // 2. CI/CD (15 pts)
    let ciScore = 0;
    const workflowFiles = Array.from(files).filter((f) => f.startsWith(".github/workflows/") &&
        (f.endsWith(".yml") || f.endsWith(".yaml")));
    if (workflowFiles.length > 0) {
        ciScore += 10;
        if (workflowFiles.length >= 3)
            ciScore += 5;
        findings.push({
            severity: "positive",
            title: `${workflowFiles.length} CI/CD workflow(s)`,
            description: "GitHub Actions workflows automate checks.",
        });
    }
    else if (files.has(".travis.yml") ||
        files.has(".circleci/config.yml") ||
        files.has("Jenkinsfile")) {
        ciScore += 8;
        findings.push({
            severity: "positive",
            title: "CI/CD pipeline detected",
            description: "Continuous integration is configured.",
        });
    }
    else {
        findings.push({
            severity: "critical",
            title: "No CI/CD pipeline",
            description: "No GitHub Actions, Travis CI, or CircleCI configuration found.",
        });
    }
    dimensions.push({
        name: "CI/CD",
        score: Math.min(ciScore, 15),
        maxScore: 15,
    });
    // 3. Security (20 pts)
    let securityScore = 0;
    const hasSecurityMd = files.has("SECURITY.md") ||
        files.has("security.md") ||
        files.has(".github/SECURITY.md");
    if (hasSecurityMd) {
        securityScore += 5;
        findings.push({
            severity: "positive",
            title: "Security policy present",
            description: "SECURITY.md provides vulnerability reporting guidelines.",
        });
    }
    else {
        findings.push({
            severity: "warning",
            title: "No security policy",
            description: "No SECURITY.md found. Add vulnerability reporting guidelines.",
        });
    }
    if (hasCodeowners)
        securityScore += 3;
    const envFiles = Array.from(files).filter(isCommittedEnvFile);
    if (envFiles.length > 0) {
        findings.push({
            severity: "critical",
            title: `${envFiles.length} .env file(s) committed`,
            description: "Environment files may contain secrets in source control.",
        });
    }
    else {
        securityScore += 4;
    }
    if (files.has(".gitignore"))
        securityScore += 3;
    const hasDependabot = files.has(".github/dependabot.yml") ||
        files.has(".github/dependabot.yaml");
    const hasRenovate = files.has("renovate.json") ||
        files.has(".renovaterc") ||
        files.has(".renovaterc.json");
    if (hasDependabot || hasRenovate) {
        securityScore += 5;
        findings.push({
            severity: "positive",
            title: "Automated dependency updates",
            description: "Dependabot or Renovate is configured.",
        });
    }
    dimensions.push({
        name: "Security",
        score: Math.min(securityScore, 20),
        maxScore: 20,
    });
    // 4. Testing (10 pts)
    let testScore = 0;
    const testConfigs = TEST_CONFIG_FILES;
    const hasTestConfig = testConfigs.some((f) => files.has(f));
    const hasTestDir = ["tests", "test", "__tests__", "spec", "e2e"].some((d) => dirs.has(d));
    if (hasTestConfig)
        testScore += 5;
    if (hasTestDir)
        testScore += 5;
    if (testScore > 0) {
        findings.push({
            severity: "positive",
            title: "Testing infrastructure",
            description: "Test configuration and test directories are present.",
        });
    }
    else {
        findings.push({
            severity: "warning",
            title: "No test infrastructure detected",
            description: "No test config or test directories found at root level.",
        });
    }
    dimensions.push({
        name: "Testing",
        score: Math.min(testScore, 10),
        maxScore: 10,
    });
    // 5. Governance docs (15 pts)
    let govScore = 0;
    const hasClaudeMd = files.has("CLAUDE.md") || dirs.has(".claude");
    const hasCursorrules = files.has(".cursorrules");
    const hasGovDir = ["governance", "compliance", ".governance"].some((d) => dirs.has(d));
    if (hasClaudeMd || hasCursorrules) {
        govScore += 10;
        findings.push({
            severity: "positive",
            title: "AI governance configuration",
            description: "CLAUDE.md or .cursorrules found. AI tooling is governed.",
        });
    }
    else {
        findings.push({
            severity: "warning",
            title: "No AI governance config",
            description: "No CLAUDE.md or .cursorrules. AI coding tools operate without structural rules.",
        });
    }
    if (hasGovDir)
        govScore += 5;
    dimensions.push({
        name: "Governance",
        score: Math.min(govScore, 15),
        maxScore: 15,
    });
    // 6. Project hygiene (10 pts)
    let hygieneScore = 0;
    if (files.has("README.md") || files.has("readme.md"))
        hygieneScore += 3;
    if (files.has("CONTRIBUTING.md") || files.has("contributing.md"))
        hygieneScore += 2;
    if (files.has("LICENSE") ||
        files.has("LICENSE.md") ||
        files.has("license"))
        hygieneScore += 2;
    if (files.has("CHANGELOG.md") ||
        files.has("changelog.md") ||
        files.has("CHANGES.md") ||
        files.has("CHANGES"))
        hygieneScore += 1;
    const hasLockfile = [
        "poetry.lock",
        "Pipfile.lock",
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        "Cargo.lock",
        "go.sum",
        "uv.lock",
    ].some((f) => files.has(f));
    if (hasLockfile)
        hygieneScore += 2;
    dimensions.push({
        name: "Hygiene",
        score: Math.min(hygieneScore, 10),
        maxScore: 10,
    });
    // Calculate total
    const score = dimensions.reduce((sum, d) => sum + d.score, 0);
    const grade = getGrade(score);
    // Sort findings by severity
    const severityOrder = {
        critical: 0,
        warning: 1,
        info: 2,
        positive: 3,
    };
    findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    return {
        score,
        grade,
        findings: findings.slice(0, 5),
        dimensions,
        repoName: `${owner}/${repo}`,
        repoUrl: `https://github.com/${owner}/${repo}`,
        euAiActReadiness: getEuAiActReadiness(score),
        scannedAt: new Date().toISOString(),
    };
}
