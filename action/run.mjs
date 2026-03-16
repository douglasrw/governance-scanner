import { scanRepo } from '../dist/scanner.js';
import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync } from 'node:fs';

function getResultId(repoName) {
  return createHash('sha256')
    .update(repoName.toLowerCase().trim())
    .digest('hex')
    .slice(0, 12);
}

function buildCommentBody(result, reportUrl) {
  const marker = '<!-- governance-scanner -->';

  const icons = {
    critical: '\u274c',
    warning: '\u26a0\ufe0f',
    info: '\u2139\ufe0f',
    positive: '\u2705',
  };

  let dimensionRows = '';
  for (const d of result.dimensions) {
    const filled = Math.round((d.score / d.maxScore) * 10);
    const empty = 10 - filled;
    const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
    dimensionRows += `| ${d.name} | \`${bar}\` | **${d.score}**/${d.maxScore} |\n`;
  }

  let findingsLines = '';
  for (const f of result.findings) {
    const icon = icons[f.severity] || '';
    findingsLines += `- ${icon} **${f.title}** -- ${f.description}\n`;
  }

  return `${marker}
## Governance Scanner Report

| | |
|---|---|
| **Score** | **${result.score}/100** (Grade: **${result.grade}**) |
| **EU AI Act Readiness** | ${result.euAiActReadiness} |

<details>
<summary>Dimension Breakdown</summary>

| Dimension | | Score |
|-----------|---|-------|
${dimensionRows.trimEnd()}

</details>

### Key Findings

${findingsLines.trimEnd()}

---

[Full Interactive Report](${reportUrl}) | [Express Audit](https://walseth.ai/pricing)

<sub>Scanned by <a href="https://github.com/douglasrw/governance-scanner">governance-scanner</a> | <a href="https://walseth.ai/scan">walseth.ai</a></sub>
`;
}

async function postOrUpdateComment(token, repo, prNumber, body) {
  const marker = '<!-- governance-scanner -->';
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  // Check for existing comment to update (avoid duplicates)
  const commentsRes = await fetch(
    `https://api.github.com/repos/${repo}/issues/${prNumber}/comments?per_page=100`,
    { headers },
  );

  if (commentsRes.ok) {
    const comments = await commentsRes.json();
    const existing = comments.find((c) => c.body?.includes(marker));

    if (existing) {
      const res = await fetch(
        `https://api.github.com/repos/${repo}/issues/comments/${existing.id}`,
        {
          method: 'PATCH',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ body }),
        },
      );
      if (res.ok) {
        console.log(`Updated existing PR comment #${existing.id}`);
      } else {
        console.warn(`Failed to update comment: ${res.status}`);
      }
      return;
    }
  }

  // Create new comment
  const res = await fetch(
    `https://api.github.com/repos/${repo}/issues/${prNumber}/comments`,
    {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    },
  );
  if (res.ok) {
    console.log(`Posted PR comment on #${prNumber}`);
  } else {
    console.warn(`Failed to post comment: ${res.status}`);
  }
}

function getPrNumber() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) return null;
  try {
    const event = JSON.parse(readFileSync(eventPath, 'utf8'));
    return event.pull_request?.number || null;
  } catch {
    return null;
  }
}

async function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) {
    console.error('GITHUB_REPOSITORY not set. This action must run inside GitHub Actions.');
    process.exit(1);
  }

  const token = process.env.INPUT_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  const failBelowRaw = process.env.INPUT_FAIL_BELOW;
  const failBelow = failBelowRaw ? parseInt(failBelowRaw, 10) : null;
  const shouldComment = process.env.INPUT_COMMENT !== 'false';
  const eventName = process.env.GITHUB_EVENT_NAME;
  const outputFile = process.env.GITHUB_OUTPUT;

  console.log(`Scanning ${repo}...`);

  let result;
  try {
    result = await scanRepo(repo);
  } catch (err) {
    console.error(`Scan failed: ${err.message}`);
    process.exit(1);
  }

  console.log(`Score: ${result.score}/100 (Grade: ${result.grade})`);

  // Set outputs
  const resultId = getResultId(result.repoName);
  const reportUrl = `https://walseth.ai/scan/results/${resultId}`;

  if (outputFile) {
    appendFileSync(outputFile, `score=${result.score}\n`);
    appendFileSync(outputFile, `grade=${result.grade}\n`);
    appendFileSync(outputFile, `report-url=${reportUrl}\n`);
  }

  // Post PR comment if this is a pull_request event
  const isPR = eventName === 'pull_request' || eventName === 'pull_request_target';
  if (shouldComment && token && isPR) {
    const prNumber = getPrNumber();
    if (prNumber) {
      const body = buildCommentBody(result, reportUrl);
      await postOrUpdateComment(token, repo, prNumber, body);
    } else {
      console.log('No PR number found in event payload, skipping comment.');
    }
  } else if (!isPR) {
    console.log('Not a pull request event, skipping comment. Outputs are set.');
  }

  // Fail if below threshold
  if (failBelow !== null && !isNaN(failBelow) && result.score < failBelow) {
    console.error(`Governance score ${result.score} is below threshold ${failBelow}. Failing check.`);
    process.exit(1);
  }
}

main();
