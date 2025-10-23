import { ResultAsync } from 'neverthrow';
import { DEFAULT_ANALYSIS_OPTIONS } from './configs/default-config.js';
import { type ComplexityAnalysisError } from './errors/index.js';
import type { ComplexityMetrics, FileComplexity } from './labeler-types.js';
import type { AnalysisOptions } from './types/config.js';
export { DEFAULT_ANALYSIS_OPTIONS };
export type { AnalysisOptions };
export declare class ComplexityAnalyzer {
    analyzeFile(filePath: string, options?: Partial<AnalysisOptions>): ResultAsync<FileComplexity, ComplexityAnalysisError>;
    analyzeFiles(filePaths: string[], options?: Partial<AnalysisOptions>): ResultAsync<ComplexityMetrics, ComplexityAnalysisError>;
}
export declare function aggregateMetrics(results: FileComplexity[]): Omit<ComplexityMetrics, 'skippedFiles' | 'truncated' | 'totalPRFiles' | 'hasTsconfig'> | undefined;
export declare function createComplexityAnalyzer(): ComplexityAnalyzer;
