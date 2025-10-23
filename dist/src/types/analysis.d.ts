import type { Violations } from '../errors/types.js';
export interface FileMetrics {
    path: string;
    size: number;
    lines: number;
    additions: number;
    deletions: number;
}
export interface AnalysisResult {
    metrics: {
        totalFiles: number;
        totalAdditions: number;
        filesAnalyzed: FileMetrics[];
        filesExcluded: string[];
        filesSkippedBinary: string[];
        filesWithErrors: string[];
    };
    violations: Violations;
}
