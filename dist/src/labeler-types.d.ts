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
    filesAnalyzed: FileComplexity[];
    filesSkipped: string[];
}
export interface FileComplexity {
    filename: string;
    complexity: number;
    functions: FunctionComplexity[];
}
export interface FunctionComplexity {
    name: string;
    line: number;
    complexity: number;
}
export interface PRMetrics {
    totalAdditions: number;
    files: FileMetrics[];
    complexity?: ComplexityMetrics;
}
export interface FileMetrics {
    filename: string;
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
export declare const DEFAULT_LABELER_CONFIG: LabelerConfig;
