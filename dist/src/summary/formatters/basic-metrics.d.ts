import type { AnalysisResult } from '../../types/analysis.js';
export interface FormatBasicMetricsOptions {
    includeHeader?: boolean;
    includeTimestamp?: boolean;
}
export declare function formatBasicMetrics(metrics: AnalysisResult['metrics'], options?: FormatBasicMetricsOptions): string;
