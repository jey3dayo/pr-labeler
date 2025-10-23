import type { ComplexityConfig, ComplexityMetrics } from '../../labeler-types.js';
export interface SummaryContext {
    owner: string;
    repo: string;
    sha: string;
}
export declare function generateComplexitySummary(metrics: ComplexityMetrics, config: ComplexityConfig, context: SummaryContext): string;
