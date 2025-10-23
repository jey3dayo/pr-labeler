import { Result } from 'neverthrow';
import type { ComplexityConfig, ComplexityMetrics } from '../labeler-types';
import { type SummaryContext } from '../report-formatter';
import type { AnalysisResult } from '../types/analysis.js';
export declare function writeSummary(content: string): Promise<void>;
export interface SummaryWriteResult {
    action: 'written' | 'skipped';
    bytesWritten?: number;
}
export declare function writeSummaryWithAnalysis(analysis: AnalysisResult, config: {
    enableSummary: boolean;
}, complexity?: {
    metrics: ComplexityMetrics;
    config: ComplexityConfig;
    context: SummaryContext;
}, options?: {
    disabledFeatures?: string[];
}): Promise<Result<SummaryWriteResult, Error>>;
