export interface ScanResult {
    score: number;
    grade: string;
    findings: Finding[];
    dimensions: Dimension[];
    repoName: string;
    repoUrl: string;
    euAiActReadiness: string;
    scannedAt: string;
}
export interface Finding {
    severity: "critical" | "warning" | "info" | "positive";
    title: string;
    description: string;
}
export interface Dimension {
    name: string;
    score: number;
    maxScore: number;
}
export declare function isCommittedEnvFile(filePath: string): boolean;
export declare function parseGithubUrl(url: string): {
    owner: string;
    repo: string;
} | null;
export declare function scanRepo(repoUrl: string): Promise<ScanResult>;
