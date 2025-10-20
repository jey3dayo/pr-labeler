import { ResultAsync } from 'neverthrow';
import { type ComplexityAnalysisError } from './errors/index.js';
import type { ComplexityMetrics, FileComplexity } from './labeler-types.js';
export interface AnalysisOptions {
    concurrency?: number;
    timeout?: number;
    fileTimeout?: number;
    maxFileSize?: number;
    extensions?: string[];
    exclude?: string[];
}
export declare const DEFAULT_ANALYSIS_OPTIONS: Required<AnalysisOptions>;
export declare class ComplexityAnalyzer {
    analyzeFile(filePath: string, options?: Partial<AnalysisOptions>): ResultAsync<FileComplexity, ComplexityAnalysisError>;
    analyzeFiles(filePaths: string[], options?: Partial<AnalysisOptions>): ResultAsync<ComplexityMetrics, ComplexityAnalysisError>;
}
export declare function aggregateMetrics(results: FileComplexity[]): Omit<ComplexityMetrics, 'skippedFiles' | 'truncated' | 'totalPRFiles' | 'hasTsconfig'> | undefined;
export declare function createComplexityAnalyzer(): ComplexityAnalyzer;
