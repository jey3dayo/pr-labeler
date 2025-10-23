import { Result } from 'neverthrow';
import type { DiffFile } from './diff-strategy';
import type { FileAnalysisError } from './errors/index.js';
import type { AnalysisResult, FileMetrics, Metrics } from './types/analysis.js';
export type { AnalysisResult, FileMetrics, Metrics };
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
