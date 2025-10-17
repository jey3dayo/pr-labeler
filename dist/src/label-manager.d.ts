import { Result } from 'neverthrow';
import type { GitHubAPIError, Violations } from './errors';
import type { AnalysisResult } from './file-metrics';
export interface LabelConfig {
    sizeLabelThresholds: {
        small: number;
        medium: number;
        large: number;
        xlarge: number;
    };
    applySizeLabels?: boolean;
    autoRemoveLabels?: boolean;
    largeFilesLabel?: string;
    tooManyFilesLabel?: string;
}
export interface LabelUpdate {
    added: string[];
    removed: string[];
    current: string[];
}
interface PRContext {
    owner: string;
    repo: string;
    pullNumber: number;
}
export declare function getSizeLabel(totalAdditions: number, thresholds: LabelConfig['sizeLabelThresholds']): string;
export declare function getDetailLabels(violations: Violations, customLabels?: {
    largeFiles?: string;
    tooManyFiles?: string;
}): string[];
export declare function getCurrentLabels(token: string, context: PRContext): Promise<Result<string[], GitHubAPIError>>;
export declare function addLabels(labels: string[], token: string, context: PRContext): Promise<Result<void, GitHubAPIError>>;
export declare function removeLabels(labels: string[], token: string, context: PRContext): Promise<Result<void, GitHubAPIError>>;
export declare function updateLabels(analysisResult: AnalysisResult, config: LabelConfig, token: string, context: PRContext): Promise<Result<LabelUpdate, GitHubAPIError>>;
export {};
//# sourceMappingURL=label-manager.d.ts.map