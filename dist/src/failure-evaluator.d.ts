import type { ViolationDetail } from './errors/index.js';
import type { Config, SizeThresholdsV2 } from './input-mapper.js';
export interface FailureEvaluationInput {
    config: Config;
    appliedLabels: string[] | undefined;
    violations: {
        largeFiles: ViolationDetail[];
        exceedsFileLines: ViolationDetail[];
        exceedsAdditions: boolean;
        exceedsFileCount: boolean;
    };
    metrics: {
        totalAdditions: number;
    };
    sizeThresholds: SizeThresholdsV2;
}
export declare function evaluateFailureConditions(input: FailureEvaluationInput): string[];
