#!/usr/bin/env node
import { scanRepo, parseGithubUrl } from "./scanner.js";
import crypto from "crypto";
// ANSI color helpers
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const blue = (s) => `\x1b[34m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const bgRed = (s) => `\x1b[41m\x1b[97m${s}\x1b[0m`;
const bgGreen = (s) => `\x1b[42m\x1b[97m${s}\x1b[0m`;
const bgYellow = (s) => `\x1b[43m\x1b[30m${s}\x1b[0m`;
const bgBlue = (s) => `\x1b[44m\x1b[97m${s}\x1b[0m`;
function gradeColor(grade) {
    switch (grade) {
        case "A": return green;
        case "B": return blue;
        case "C": return yellow;
        case "D": return red;
        case "F": return (s) => bgRed(` ${s} `);
        default: return dim;
    }
}
function severityIcon(severity) {
    switch (severity) {
        case "critical": return red("X");
        case "warning": return yellow("!");
        case "info": return blue("i");
        case "positive": return green("v");
        default: return " ";
    }
}
function bar(score, max, width = 20) {
    const filled = Math.round((score / max) * width);
    const empty = width - filled;
    const ratio = score / max;
    const color = ratio >= 0.7 ? green : ratio >= 0.4 ? yellow : red;
    return color("\u2588".repeat(filled)) + dim("\u2591".repeat(empty));
}
function getResultId(repoName) {
    const normalized = repoName.toLowerCase().trim();
    return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 12);
}
function printResults(result) {
    const colorGrade = gradeColor(result.grade);
    console.log("");
    console.log(bold("  Governance Scanner Report"));
    console.log(dim("  " + "\u2500".repeat(50)));
    console.log("");
    console.log(`  Repository:  ${cyan(result.repoName)}`);
    console.log(`  Score:       ${bold(result.score + "/100")}  Grade: ${colorGrade(bold(result.grade))}`);
    console.log(`  EU AI Act:   ${result.euAiActReadiness}`);
    console.log(`  Scanned:     ${dim(result.scannedAt)}`);
    console.log("");
    // Dimension breakdown
    console.log(bold("  Dimensions"));
    console.log(dim("  " + "\u2500".repeat(50)));
    for (const d of result.dimensions) {
        const label = d.name.padEnd(14);
        const scoreStr = `${d.score}/${d.maxScore}`.padStart(6);
        console.log(`  ${label} ${bar(d.score, d.maxScore)} ${scoreStr}`);
    }
    console.log("");
    // Key findings
    if (result.findings.length > 0) {
        console.log(bold("  Key Findings"));
        console.log(dim("  " + "\u2500".repeat(50)));
        for (const f of result.findings) {
            console.log(`  ${severityIcon(f.severity)} ${f.title}`);
            console.log(`    ${dim(f.description)}`);
        }
        console.log("");
    }
    // Full report link
    const resultId = getResultId(result.repoName);
    const reportUrl = `https://walseth.ai/scan/results/${resultId}`;
    console.log(bold("  " + "\u250C" + "\u2500".repeat(56) + "\u2510"));
    console.log(bold("  \u2502") + "  Full interactive report:                              " + bold("\u2502"));
    console.log(bold("  \u2502") + `  ${cyan(reportUrl)}  ` + bold("\u2502"));
    console.log(bold("  \u2502") + "                                                        " + bold("\u2502"));
    console.log(bold("  \u2502") + `  ${yellow("Express Audit ($500)")} - Expert review with            ` + bold("\u2502"));
    console.log(bold("  \u2502") + "  actionable remediation plan and compliance roadmap.    " + bold("\u2502"));
    console.log(bold("  \u2502") + `  ${dim("https://walseth.ai/pricing")}                            ` + bold("\u2502"));
    console.log(bold("  " + "\u2514" + "\u2500".repeat(56) + "\u2518"));
    console.log("");
}
function printUsage() {
    console.log("");
    console.log(bold("  governance-scanner") + " - AI governance posture scanner for GitHub repos");
    console.log("");
    console.log("  " + bold("USAGE"));
    console.log("    npx governance-scanner <github-url>");
    console.log("    npx governance-scanner <owner/repo>");
    console.log("");
    console.log("  " + bold("EXAMPLES"));
    console.log("    npx governance-scanner https://github.com/crewAIInc/crewAI");
    console.log("    npx governance-scanner langchain-ai/langchain");
    console.log("");
    console.log("  " + bold("OPTIONS"));
    console.log("    --json       Output raw JSON instead of formatted report");
    console.log("    --help, -h   Show this help message");
    console.log("");
    console.log("  " + bold("ENVIRONMENT"));
    console.log("    GITHUB_TOKEN   Optional. Set to increase GitHub API rate limit.");
    console.log("");
    console.log("  " + dim("https://walseth.ai/scan"));
    console.log("");
}
async function main() {
    const args = process.argv.slice(2);
    if (args.includes("--help") || args.includes("-h") || args.length === 0) {
        printUsage();
        process.exit(args.length === 0 ? 1 : 0);
    }
    const jsonMode = args.includes("--json");
    const repoArg = args.find((a) => !a.startsWith("--"));
    if (!repoArg) {
        console.error(red("  Error: Repository URL or owner/repo is required."));
        printUsage();
        process.exit(1);
    }
    // Normalize input: accept owner/repo shorthand
    let repoUrl = repoArg;
    if (!repoUrl.startsWith("http")) {
        const parsed = parseGithubUrl(repoUrl);
        if (parsed) {
            repoUrl = `https://github.com/${parsed.owner}/${parsed.repo}`;
        }
    }
    if (!jsonMode) {
        console.log("");
        console.log(dim(`  Scanning ${repoUrl}...`));
    }
    try {
        const result = await scanRepo(repoUrl);
        if (jsonMode) {
            const resultId = getResultId(result.repoName);
            console.log(JSON.stringify({ ...result, resultId }, null, 2));
        }
        else {
            printResults(result);
        }
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        if (message === "REPO_NOT_FOUND") {
            console.error(red("\n  Error: Repository not found."));
            console.error(dim("  Make sure it is a public GitHub repository.\n"));
        }
        else if (message === "PRIVATE_REPO") {
            console.error(red("\n  Error: This appears to be a private repository."));
            console.error(dim("  Only public repositories can be scanned.\n"));
        }
        else if (message === "RATE_LIMITED") {
            console.error(red("\n  Error: GitHub API rate limit reached."));
            console.error(dim("  Set GITHUB_TOKEN environment variable to increase the limit."));
            console.error(dim("  Try again in a few minutes.\n"));
        }
        else if (message === "INVALID_URL") {
            console.error(red("\n  Error: Invalid GitHub repository URL."));
            console.error(dim("  Use format: https://github.com/owner/repo or owner/repo\n"));
        }
        else {
            console.error(red(`\n  Error: ${message}`));
            console.error(dim("  Please try again. If the issue persists, check your network connection.\n"));
        }
        process.exit(1);
    }
}
main();
