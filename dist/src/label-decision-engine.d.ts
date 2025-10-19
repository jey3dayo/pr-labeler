import { Result } from 'neverthrow';
import type { LabelDecisions, LabelerConfig, PRMetrics } from './labeler-types.js';
export declare function decideLabels(metrics: PRMetrics, config: LabelerConfig): Result<LabelDecisions, never>;
export declare function decideSizeLabel(additions: number, thresholds: {
    small: number;
    medium: number;
    large: number;
}): string;
export declare function decideComplexityLabel(complexity: number, thresholds: {
    medium: number;
    high: number;
}): string | null;
export declare function decideCategoryLabels(files: string[], categories: Array<{
    label: string;
    patterns: string[];
}>): string[];
export declare function decideRiskLabel(files: string[], config: {
    high_if_no_tests_for_core: boolean;
    core_paths: string[];
    coverage_threshold?: number;
    config_files: string[];
}): string | null;
