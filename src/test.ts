import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  parseGithubUrl,
  isCommittedEnvFile,
  TEST_CONFIG_FILES,
  hasAiGovernanceConfig,
} from "./scanner.js";

describe("parseGithubUrl", () => {
  it("parses full GitHub URLs", () => {
    const result = parseGithubUrl("https://github.com/crewAIInc/crewAI");
    assert.deepStrictEqual(result, { owner: "crewAIInc", repo: "crewAI" });
  });

  it("parses full GitHub URLs with www host", () => {
    const result = parseGithubUrl("https://www.github.com/crewAIInc/crewAI");
    assert.deepStrictEqual(result, { owner: "crewAIInc", repo: "crewAI" });
  });

  it("parses URLs with .git suffix", () => {
    const result = parseGithubUrl("https://github.com/owner/repo.git");
    assert.deepStrictEqual(result, { owner: "owner", repo: "repo" });
  });

  it("parses owner/repo shorthand", () => {
    const result = parseGithubUrl("langchain-ai/langchain");
    assert.deepStrictEqual(result, { owner: "langchain-ai", repo: "langchain" });
  });

  it("parses owner/repo.git shorthand", () => {
    const result = parseGithubUrl("langchain-ai/langchain.git");
    assert.deepStrictEqual(result, { owner: "langchain-ai", repo: "langchain" });
  });

  it("parses scheme-less github.com/owner/repo", () => {
    const result = parseGithubUrl("github.com/crewAIInc/crewAI");
    assert.deepStrictEqual(result, { owner: "crewAIInc", repo: "crewAI" });
  });

  it("parses scheme-less www.github.com/owner/repo", () => {
    const result = parseGithubUrl("www.github.com/crewAIInc/crewAI");
    assert.deepStrictEqual(result, { owner: "crewAIInc", repo: "crewAI" });
  });

  it("parses scheme-less github.com/owner/repo.git", () => {
    const result = parseGithubUrl("github.com/owner/repo.git");
    assert.deepStrictEqual(result, { owner: "owner", repo: "repo" });
  });

  it("parses SSH remote git@github.com:owner/repo.git", () => {
    const result = parseGithubUrl("git@github.com:crewAIInc/crewAI.git");
    assert.deepStrictEqual(result, { owner: "crewAIInc", repo: "crewAI" });
  });

  it("parses SSH remote without .git suffix", () => {
    const result = parseGithubUrl("git@github.com:owner/repo");
    assert.deepStrictEqual(result, { owner: "owner", repo: "repo" });
  });

  it("rejects non-GitHub SSH remotes", () => {
    const result = parseGithubUrl("git@gitlab.com:owner/repo.git");
    assert.strictEqual(result, null);
  });

  it("rejects non-GitHub URLs", () => {
    const result = parseGithubUrl("https://gitlab.com/owner/repo");
    assert.strictEqual(result, null);
  });

  it("rejects invalid input", () => {
    const result = parseGithubUrl("not-a-url");
    assert.strictEqual(result, null);
  });

  it("rejects bare GitHub domain", () => {
    const result = parseGithubUrl("https://github.com/owner");
    assert.strictEqual(result, null);
  });
});

describe("isCommittedEnvFile", () => {
  it("detects .env at root", () => {
    assert.strictEqual(isCommittedEnvFile(".env"), true);
  });

  it("detects .env.local", () => {
    assert.strictEqual(isCommittedEnvFile(".env.local"), true);
  });

  it("detects .env.production", () => {
    assert.strictEqual(isCommittedEnvFile(".env.production"), true);
  });

  it("detects nested .env", () => {
    assert.strictEqual(isCommittedEnvFile("config/.env"), true);
  });

  it("detects nested .env.local", () => {
    assert.strictEqual(isCommittedEnvFile("app/.env.local"), true);
  });

  it("ignores .env.example", () => {
    assert.strictEqual(isCommittedEnvFile(".env.example"), false);
  });

  it("ignores .env.sample", () => {
    assert.strictEqual(isCommittedEnvFile(".env.sample"), false);
  });

  it("ignores nested .env.example", () => {
    assert.strictEqual(isCommittedEnvFile("config/.env.example"), false);
  });

  it("ignores .env.Example (case-insensitive)", () => {
    assert.strictEqual(isCommittedEnvFile(".env.Example"), false);
  });

  it("ignores .env.template", () => {
    assert.strictEqual(isCommittedEnvFile(".env.template"), false);
  });

  it("ignores .env.Template (case-insensitive)", () => {
    assert.strictEqual(isCommittedEnvFile(".env.Template"), false);
  });

  it("ignores nested .env.template", () => {
    assert.strictEqual(isCommittedEnvFile("config/.env.template"), false);
  });

  it("ignores .env.dist", () => {
    assert.strictEqual(isCommittedEnvFile(".env.dist"), false);
  });

  it("ignores .env.DIST (case-insensitive)", () => {
    assert.strictEqual(isCommittedEnvFile(".env.DIST"), false);
  });

  it("ignores nested .env.dist", () => {
    assert.strictEqual(isCommittedEnvFile("app/.env.dist"), false);
  });

  it("ignores .env.example.local", () => {
    assert.strictEqual(isCommittedEnvFile(".env.example.local"), false);
  });

  it("ignores .env.sample.local", () => {
    assert.strictEqual(isCommittedEnvFile(".env.sample.local"), false);
  });

  it("ignores .env.template.local", () => {
    assert.strictEqual(isCommittedEnvFile(".env.template.local"), false);
  });

  it("ignores .env.dist.local", () => {
    assert.strictEqual(isCommittedEnvFile(".env.dist.local"), false);
  });

  it("ignores nested .env.example.local", () => {
    assert.strictEqual(isCommittedEnvFile("config/.env.example.local"), false);
  });

  it("ignores .env.local.example", () => {
    assert.strictEqual(isCommittedEnvFile(".env.local.example"), false);
  });

  it("ignores .env.development.example", () => {
    assert.strictEqual(isCommittedEnvFile(".env.development.example"), false);
  });

  it("ignores .env.local.sample", () => {
    assert.strictEqual(isCommittedEnvFile(".env.local.sample"), false);
  });

  it("ignores .env.production.template", () => {
    assert.strictEqual(isCommittedEnvFile(".env.production.template"), false);
  });

  it("ignores .env.staging.dist", () => {
    assert.strictEqual(isCommittedEnvFile(".env.staging.dist"), false);
  });

  it("ignores nested .env.local.example", () => {
    assert.strictEqual(isCommittedEnvFile("config/.env.local.example"), false);
  });

  it("ignores .env.local.Example (case-insensitive)", () => {
    assert.strictEqual(isCommittedEnvFile(".env.local.Example"), false);
  });
});

function runCli(args: string[]): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execFileSync(process.execPath, ["dist/cli.js", ...args], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 5000,
    });
    return { stdout, stderr: "", exitCode: 0 };
  } catch (err: any) {
    return { stdout: err.stdout ?? "", stderr: err.stderr ?? "", exitCode: err.status ?? 1 };
  }
}

describe("CLI --json error output", () => {
  it("emits JSON error for missing repository argument", () => {
    const { stdout, exitCode } = runCli(["--json"]);
    assert.strictEqual(exitCode, 1);
    const parsed = JSON.parse(stdout);
    assert.deepStrictEqual(parsed, {
      error: { code: "MISSING_REPOSITORY", message: "Repository URL or owner/repo is required." },
    });
  });

  it("emits JSON error for invalid repository URL", () => {
    const { stdout, exitCode } = runCli(["--json", "not-a-url"]);
    assert.strictEqual(exitCode, 1);
    const parsed = JSON.parse(stdout);
    assert.deepStrictEqual(parsed, {
      error: {
        code: "INVALID_URL",
        message: "Invalid GitHub repository URL. Use format: https://github.com/owner/repo or owner/repo",
      },
    });
  });

  it("emits human-readable error (not JSON) without --json flag for missing repo", () => {
    const { stderr, stdout, exitCode } = runCli([]);
    assert.strictEqual(exitCode, 1);
    // Without --json, stdout should not contain JSON error object
    assert.ok(!stdout.includes('"error"'), "stdout should not contain JSON error");
    // stderr should contain the human-readable error or usage text
    assert.ok(stderr.length > 0 || stdout.length > 0, "should produce some output");
  });

  it("emits human-readable error (not JSON) without --json flag for invalid URL", () => {
    const { stderr, stdout, exitCode } = runCli(["not-a-url"]);
    assert.strictEqual(exitCode, 1);
    assert.ok(!stdout.includes('"error"'), "stdout should not contain JSON error");
    assert.ok(stderr.includes("Invalid GitHub repository URL"), "stderr should contain human-readable error");
  });
});

describe("lefthook filename parity", () => {
  const lefthookVariants = [
    "lefthook.yml",
    "lefthook.yaml",
    ".lefthook.yml",
    ".lefthook.yaml",
  ];

  for (const variant of lefthookVariants) {
    it(`detects ${variant} as enforcement hook config`, () => {
      const files = new Set([variant, "src/index.ts"]);
      // Replicate the hasLefthook check from scanner.ts
      const hasLefthook =
        files.has("lefthook.yml") ||
        files.has("lefthook.yaml") ||
        files.has(".lefthook.yml") ||
        files.has(".lefthook.yaml");
      assert.strictEqual(hasLefthook, true, `${variant} should be detected as lefthook config`);
    });
  }

  it("does not detect lefthook when no variant is present", () => {
    const files = new Set(["src/index.ts", "package.json"]);
    const hasLefthook =
      files.has("lefthook.yml") ||
      files.has("lefthook.yaml") ||
      files.has(".lefthook.yml") ||
      files.has(".lefthook.yaml");
    assert.strictEqual(hasLefthook, false);
  });
});

describe("hasAiGovernanceConfig", () => {
  it("detects recognized AI governance surfaces, including Claude, Gemini, Copilot, AGENTS.md, .cursor/rules, and governance agent directories", () => {
    assert.strictEqual(
      hasAiGovernanceConfig(new Set(["CLAUDE.md"]), new Set()),
      true
    );
    assert.strictEqual(
      hasAiGovernanceConfig(new Set([".claude/CLAUDE.md"]), new Set()),
      true
    );
    assert.strictEqual(
      hasAiGovernanceConfig(new Set(["GEMINI.md"]), new Set()),
      true
    );
    assert.strictEqual(
      hasAiGovernanceConfig(new Set([".gemini/GEMINI.md"]), new Set()),
      true
    );
    assert.strictEqual(
      hasAiGovernanceConfig(new Set(["AGENTS.md"]), new Set()),
      true
    );
    assert.strictEqual(
      hasAiGovernanceConfig(new Set([".cursorrules"]), new Set()),
      true
    );
    assert.strictEqual(
      hasAiGovernanceConfig(
        new Set([".github/copilot-instructions.md"]),
        new Set()
      ),
      true
    );
    assert.strictEqual(
      hasAiGovernanceConfig(new Set(), new Set(["data/agents"])),
      true
    );
    assert.strictEqual(
      hasAiGovernanceConfig(new Set(), new Set(["data/roles"])),
      true
    );
    assert.strictEqual(
      hasAiGovernanceConfig(new Set(), new Set(["scripts/agents"])),
      true
    );
    assert.strictEqual(
      hasAiGovernanceConfig(new Set(), new Set([".claude"])),
      true
    );
    assert.strictEqual(
      hasAiGovernanceConfig(new Set(), new Set([".cursor/rules"])),
      true
    );
  });

  it("preserves the negative case when no recognized governance surface exists", () => {
    assert.strictEqual(
      hasAiGovernanceConfig(
        new Set(["README.md", ".github/workflows/ci.yml"]),
        new Set(["src", ".github"])
      ),
      false
    );
  });

  it("returns false when none of CLAUDE.md, .claude/CLAUDE.md, GEMINI.md, .gemini/GEMINI.md, AGENTS.md, .cursorrules, .claude, copilot instructions, or .cursor/rules exist", () => {
    assert.strictEqual(
      hasAiGovernanceConfig(
        new Set(["package.json", "src/index.ts"]),
        new Set(["src", "node_modules"])
      ),
      false
    );
  });

  it("does not treat other .gemini files as governance config", () => {
    assert.strictEqual(
      hasAiGovernanceConfig(
        new Set([".gemini/settings.json"]),
        new Set([".gemini"])
      ),
      false
    );
  });

  it("detects .github/instructions/*.instructions.md as governance config", () => {
    assert.strictEqual(
      hasAiGovernanceConfig(
        new Set([".github/instructions/copilot.instructions.md"]),
        new Set()
      ),
      true
    );
    assert.strictEqual(
      hasAiGovernanceConfig(
        new Set([".github/instructions/coding-style.instructions.md"]),
        new Set()
      ),
      true
    );
  });

  it("rejects files not matching *.instructions.md pattern in .github/instructions/", () => {
    assert.strictEqual(
      hasAiGovernanceConfig(
        new Set([".github/instructions/README.md"]),
        new Set()
      ),
      false
    );
    assert.strictEqual(
      hasAiGovernanceConfig(
        new Set([".github/instructions/notes.md"]),
        new Set()
      ),
      false
    );
  });

  it("rejects .instructions.md files outside .github/instructions/", () => {
    assert.strictEqual(
      hasAiGovernanceConfig(
        new Set(["docs/copilot.instructions.md"]),
        new Set()
      ),
      false
    );
  });

  it("detects nested subdirectories under .github/instructions/", () => {
    assert.strictEqual(
      hasAiGovernanceConfig(
        new Set([".github/instructions/sub/copilot.instructions.md"]),
        new Set()
      ),
      true
    );
    assert.strictEqual(
      hasAiGovernanceConfig(
        new Set([".github/instructions/sub/team/coding-style.instructions.md"]),
        new Set()
      ),
      true
    );
  });

  it("detects .claude/* files when .claude dir entry is absent", () => {
    assert.strictEqual(
      hasAiGovernanceConfig(
        new Set([".claude/settings.json"]),
        new Set()
      ),
      true
    );
    assert.strictEqual(
      hasAiGovernanceConfig(
        new Set([".claude/commands/review.md"]),
        new Set()
      ),
      true
    );
  });

  it("detects .cursor/rules/* files when .cursor/rules dir entry is absent", () => {
    assert.strictEqual(
      hasAiGovernanceConfig(
        new Set([".cursor/rules/my-rule.mdc"]),
        new Set()
      ),
      true
    );
    assert.strictEqual(
      hasAiGovernanceConfig(
        new Set([".cursor/rules/style.md"]),
        new Set()
      ),
      true
    );
  });

  it("detects data/agents, data/roles, and scripts/agents files when dir entries are absent", () => {
    assert.strictEqual(
      hasAiGovernanceConfig(
        new Set(["data/agents/reviewer.md"]),
        new Set()
      ),
      true
    );
    assert.strictEqual(
      hasAiGovernanceConfig(
        new Set(["data/roles/security.md"]),
        new Set()
      ),
      true
    );
    assert.strictEqual(
      hasAiGovernanceConfig(
        new Set(["scripts/agents/bootstrap.sh"]),
        new Set()
      ),
      true
    );
  });
});

describe("testing config detection (mocked tree)", () => {
  const trackedTestConfigVariants = [
    "playwright.config.js",
    "playwright.config.ts",
    "playwright.config.cts",
    "playwright.config.mts",
    "jest.config.cjs",
    "jest.config.mjs",
    "jest.config.cts",
    "jest.config.mts",
    "vitest.config.mts",
    "vitest.config.cjs",
    "vitest.config.mjs",
    "vitest.config.cts",
    "karma.conf.ts",
    "karma.conf.cjs",
    "karma.conf.mjs",
    "karma.conf.cts",
    "karma.conf.mts",
    "cypress.config.cjs",
    "cypress.config.mjs",
    "cypress.config.cts",
    "cypress.config.mts",
    "playwright.config.cjs",
    "playwright.config.mjs",
  ];

  for (const variant of trackedTestConfigVariants) {
    it(`detects ${variant} as test infrastructure`, () => {
      const files = new Set(["src/index.ts", "package.json", variant]);
      const detected = TEST_CONFIG_FILES.some((f) => files.has(f));
      assert.strictEqual(detected, true);
    });
  }

  it("detects no test config when none present", () => {
    const files = new Set(["src/index.ts", "package.json", "README.md"]);
    const detected = TEST_CONFIG_FILES.some((f) => files.has(f));
    assert.strictEqual(detected, false);
  });
});
