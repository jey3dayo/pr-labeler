import type { Violations } from './errors/index.js';
import type { AnalysisResult, FileMetrics } from './file-metrics';
import type { ComplexityConfig, ComplexityMetrics } from './labeler-types';
export interface SummaryContext {
    owner: string;
    repo: string;
    sha: string;
}
export declare function formatBytes(bytes: number): string;
export declare function formatNumber(num: number): string;
export interface FormatBasicMetricsOptions {
    includeHeader?: boolean;
}
export declare function formatBasicMetrics(metrics: AnalysisResult['metrics'], options?: FormatBasicMetricsOptions): string;
export interface FormatViolationsOptions {
    includeHeader?: boolean;
}
export declare function formatViolations(violations: Violations, options?: FormatViolationsOptions): string;
export declare function formatFileDetails(files: FileMetrics[], limit?: number): string;
export declare function escapeMarkdown(text: string): string;
export declare function generateComplexitySummary(metrics: ComplexityMetrics, config: ComplexityConfig, context: SummaryContext): string;
export declare function formatImprovementActions(violations: Violations): string;
export declare function formatBestPractices(): string;
