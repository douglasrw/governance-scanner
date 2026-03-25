import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseGithubUrl } from "./scanner.js";

describe("parseGithubUrl", () => {
  it("parses full GitHub URLs", () => {
    const result = parseGithubUrl("https://github.com/crewAIInc/crewAI");
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
