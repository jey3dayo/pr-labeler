import { Result } from 'neverthrow';
import type { ConfigurationError } from './errors/index.js';
import type { AnalysisResult } from './file-metrics';
import type { ComplexityConfig, ComplexityMetrics } from './labeler-types';
import { type SummaryContext } from './report-formatter';
export interface ActionInputs {
    github_token: string;
    file_size_limit: string;
    file_lines_limit: string;
    pr_additions_limit: string;
    pr_files_limit: string;
    apply_labels: string;
    auto_remove_labels: string;
    apply_size_labels: string;
    size_label_thresholds: string;
    large_files_label: string;
    too_many_files_label: string;
    skip_draft_pr: string;
    comment_on_pr: string;
    fail_on_violation: string;
    enable_summary: string;
    additional_exclude_patterns: string;
    enable_directory_labeling: string;
    directory_labeler_config_path: string;
    auto_create_labels: string;
    label_color: string;
    label_description: string;
    max_labels: string;
    use_default_excludes: string;
}
export interface ActionOutputs {
    large_files: string;
    pr_additions: string;
    pr_files: string;
    exceeds_file_size: string;
    exceeds_file_lines: string;
    exceeds_additions: string;
    exceeds_file_count: string;
    has_violations: string;
}
export declare function getEnvVar(key: string): string | undefined;
export declare function getGitHubToken(): Result<string, ConfigurationError>;
export declare function getActionInputs(): ActionInputs;
export declare function setActionOutputs(outputs: ActionOutputs): void;
export declare function logInfo(message: string): void;
export declare function logDebug(message: string): void;
export declare function logWarning(message: string): void;
export declare function logError(message: string): void;
export declare function setFailed(message: string): void;
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
}): Promise<Result<SummaryWriteResult, Error>>;
export declare function getPullRequestContext(): {
    owner: string;
    repo: string;
    pullNumber: number;
    baseSha: string;
    headSha: string;
    isDraft: boolean;
};
