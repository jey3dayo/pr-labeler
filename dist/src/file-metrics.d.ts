import { Result } from 'neverthrow';
import type { FileAnalysisError, Violations } from './errors';
import type { DiffFile } from './diff-strategy';
export interface FileMetrics {
    filename: string;
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
interface RepoContext {
    owner: string;
    repo: string;
    headSha?: string;
}
interface AnalysisConfig {
    fileSizeLimit: number;
    fileLineLimit: number;
    maxAddedLines: number;
    maxFileCount: number;
    excludePatterns: string[];
}
export declare function getFileSize(filePath: string, token: string, context: RepoContext): Promise<Result<number, FileAnalysisError>>;
export declare function getFileLineCount(filePath: string, maxLines?: number): Promise<Result<number, FileAnalysisError>>;
export declare function isBinaryFile(filePath: string): Promise<boolean>;
export declare function analyzeFiles(files: DiffFile[], config: AnalysisConfig, token: string, context: RepoContext): Promise<Result<AnalysisResult, FileAnalysisError>>;
export {};
//# sourceMappingURL=file-metrics.d.ts.map