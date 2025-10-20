export interface LabelerConfig {
    size: SizeConfig;
    complexity: ComplexityConfig;
    categories: CategoryConfig[];
    risk: RiskConfig;
    exclude: ExcludeConfig;
    labels: LabelPolicyConfig;
    runtime: RuntimeConfig;
}
export interface SizeConfig {
    thresholds: {
        small: number;
        medium: number;
        large: number;
    };
}
export interface ComplexityConfig {
    enabled: boolean;
    metric: 'cyclomatic';
    thresholds: {
        medium: number;
        high: number;
    };
    extensions: string[];
    exclude: string[];
}
export interface CategoryConfig {
    label: string;
    patterns: string[];
}
export interface RiskConfig {
    high_if_no_tests_for_core: boolean;
    core_paths: string[];
    coverage_threshold?: number;
    config_files: string[];
    use_ci_status?: boolean;
}
export interface ExcludeConfig {
    additional: string[];
}
export interface LabelPolicyConfig {
    create_missing: boolean;
    namespace_policies: Record<string, 'replace' | 'additive'>;
}
export interface RuntimeConfig {
    fail_on_error: boolean;
    dry_run: boolean;
}
export interface ComplexityMetrics {
    maxComplexity: number;
    avgComplexity: number;
    analyzedFiles: number;
    files: FileComplexity[];
    skippedFiles: SkippedFile[];
    syntaxErrorFiles: string[];
    truncated: boolean;
    totalPRFiles?: number;
    hasTsconfig: boolean;
}
export interface SkippedFile {
    path: string;
    reason: 'too_large' | 'analysis_failed' | 'timeout' | 'binary' | 'encoding_error' | 'syntax_error' | 'general';
    details?: string;
}
export interface FileComplexity {
    path: string;
    complexity: number;
    functions: FunctionComplexity[];
    isSyntaxError?: boolean;
}
export interface FunctionComplexity {
    name: string;
    complexity: number;
    loc: {
        start: number;
        end: number;
    };
}
export interface PRMetrics {
    totalAdditions: number;
    files: FileMetrics[];
    complexity?: ComplexityMetrics;
}
export interface FileMetrics {
    path: string;
    size: number;
    lines: number;
    additions: number;
    deletions: number;
}
export interface LabelDecisions {
    labelsToAdd: string[];
    labelsToRemove: string[];
    reasoning: LabelReasoning[];
}
export interface LabelReasoning {
    label: string;
    reason: string;
    category: 'size' | 'complexity' | 'category' | 'risk';
}
export interface LabelUpdate {
    added: string[];
    removed: string[];
    skipped: string[];
    apiCalls: number;
}
export { DEFAULT_LABELER_CONFIG } from './configs/index.js';
