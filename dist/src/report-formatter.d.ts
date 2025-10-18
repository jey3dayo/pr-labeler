import type { Violations } from './errors';
import type { AnalysisResult, FileMetrics } from './file-metrics';
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
