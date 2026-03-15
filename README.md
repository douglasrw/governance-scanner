# governance-scanner

[![npm version](https://img.shields.io/npm/v/governance-scanner.svg)](https://www.npmjs.com/package/governance-scanner)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

**AI governance posture scanner for GitHub repositories.** Instantly assess how well a repo enforces rules on AI coding agents, CI/CD pipelines, security policies, and more.

One command. Six dimensions. A letter grade.

```
npx governance-scanner https://github.com/crewAIInc/crewAI
```

---

## Why Governance Scanning Matters

AI coding tools (Claude Code, Cursor, GitHub Copilot) are writing production code across thousands of repositories. Most of these repos have **zero structural enforcement** -- no pre-commit hooks, no CLAUDE.md, no .cursorrules. The AI operates without guardrails.

The governance scanner checks whether your repo has the structural controls that make AI-assisted development safe and auditable. It's not about detecting AI-generated code -- it's about ensuring AI tools follow your rules.

This is the core idea behind the **enforcement ladder**: rules should be encoded at the deepest level possible (hooks > tests > templates > prose) so they require zero awareness to follow.

## Quick Start

### Zero-install (npx)

```bash
npx governance-scanner https://github.com/your-org/your-repo
```

### Global install

```bash
npm install -g governance-scanner
governance-scanner https://github.com/your-org/your-repo
```

### As a library

```typescript
import { scanRepo } from "governance-scanner";

const result = await scanRepo("https://github.com/your-org/your-repo");
console.log(result.grade); // "B"
console.log(result.score); // 65
```

## What It Scans

The scanner evaluates six dimensions of governance posture, each weighted by impact:

| Dimension | Max Score | What It Checks |
|-----------|-----------|----------------|
| **Enforcement** | 30 | Pre-commit hooks (Husky, lefthook, pre-commit), commit linting, CODEOWNERS, branch protection |
| **CI/CD** | 15 | GitHub Actions workflows, Travis CI, CircleCI, Jenkins |
| **Security** | 20 | SECURITY.md, .gitignore, .env file exposure, Dependabot/Renovate |
| **Testing** | 10 | Test frameworks (pytest, jest, vitest, playwright), test directories |
| **Governance** | 15 | CLAUDE.md, .cursorrules, .claude directory, governance directories |
| **Hygiene** | 10 | README, CONTRIBUTING, LICENSE, CHANGELOG, lockfiles |

**Total: 100 points.** Grades: A (80+), B (60+), C (40+), D (20+), F (<20).

## Example Output

```
  Governance Scanner Report
  ──────────────────────────────────────────────────────

  Repository:  crewAIInc/crewAI
  Score:       47/100  Grade: C
  EU AI Act:   Gaps identified
  Scanned:     2026-03-15T12:00:00.000Z

  Dimensions
  ──────────────────────────────────────────────────────
  Enforcement    ████░░░░░░░░░░░░░░░░  5/30
  CI/CD          ██████████████░░░░░░ 10/15
  Security       ████████████░░░░░░░░ 12/20
  Testing        ████████████████████ 10/10
  Governance     ░░░░░░░░░░░░░░░░░░░░  0/15
  Hygiene        ████████████████████ 10/10

  Key Findings
  ──────────────────────────────────────────────────────
  X No enforcement hooks
    No pre-commit hooks, Husky, or lefthook found.
  ! No AI governance config
    No CLAUDE.md or .cursorrules. AI tools operate ungoverned.
  v 5 CI/CD workflow(s)
    GitHub Actions workflows automate checks.

  ┌────────────────────────────────────────────────────────┐
  │  Full interactive report:                              │
  │  https://walseth.ai/scan/results/abc123def456          │
  │                                                        │
  │  Express Audit ($500) - Expert review with             │
  │  actionable remediation plan and compliance roadmap.   │
  │  https://walseth.ai/pricing                            │
  └────────────────────────────────────────────────────────┘
```

## JSON Output

For CI/CD integration, use `--json` to get machine-readable output:

```bash
npx governance-scanner --json https://github.com/your-org/your-repo
```

Returns a JSON object with `score`, `grade`, `dimensions`, `findings`, and `resultId`.

## GitHub API Rate Limits

Without authentication, GitHub allows 60 API requests per hour. Each scan uses 2 requests. To increase the limit to 5,000/hour, set a GitHub token:

```bash
export GITHUB_TOKEN=ghp_your_token_here
npx governance-scanner https://github.com/your-org/your-repo
```

The token only needs public repo read access. No special scopes required.

## Free vs Paid

| Feature | CLI (Free) | Web Scanner (Free) | Express Audit ($500) | Consulting ($25K+) |
|---------|------------|-------------------|---------------------|-------------------|
| 6-dimension score | Yes | Yes | Yes | Yes |
| Letter grade | Yes | Yes | Yes | Yes |
| Key findings | Top 5 | Top 5 | All findings | All findings |
| Remediation plan | - | - | Yes | Yes |
| Compliance roadmap | - | - | Yes | Yes |
| Custom enforcement rules | - | - | - | Yes |
| Ongoing monitoring | - | - | - | Yes |
| Architecture review | - | - | - | Yes |

**Web scanner:** [walseth.ai/scan](https://walseth.ai/scan) -- interactive report with shareable URLs.

**Express Audit:** [walseth.ai/pricing](https://walseth.ai/pricing) -- expert review of your governance posture with actionable remediation plan, delivered in 48 hours.

## Scoring Methodology

The scanner uses the **enforcement ladder** framework to evaluate governance maturity:

- **L5 (Hooks/Automation):** Pre-commit hooks, CI gates, automated enforcement. Highest score impact.
- **L4 (Tests):** Automated test suites that verify behavior.
- **L3 (Templates):** Standardized configurations (CODEOWNERS, branch protection).
- **L2 (Prose):** Written policies (SECURITY.md, CONTRIBUTING.md). Lowest enforcement.

Repos with enforcement at L5 (hooks that prevent bad commits) score dramatically higher than repos with only L2 enforcement (prose that people can ignore). This mirrors real-world governance outcomes -- structural enforcement outperforms written policy.

The scoring is deterministic and transparent. Every point maps to a specific file or directory check. No heuristics, no AI analysis, no opaque scoring.

## Context Engineering and AI Compliance

As AI coding agents become standard development tools, organizations need governance that scales. The governance scanner checks for the foundations:

- **CLAUDE.md** -- Structural rules for Claude Code agents
- **.cursorrules** -- Configuration for Cursor AI
- **Pre-commit hooks** -- Enforcement that runs before code enters the repo
- **CODEOWNERS** -- Ownership rules that gate who can approve changes

These are the building blocks of responsible AI development. Without them, AI tools generate code without constraints, creating compliance risk and technical debt.

For teams adopting AI coding tools, governance scanning should be part of the CI/CD pipeline -- just like linting and testing.

## Contributing

Issues and pull requests welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT. See [LICENSE](LICENSE).

---

Built by [Walseth AI](https://walseth.ai) -- AI governance infrastructure for teams that ship with confidence.
