export type { CategoryConfig, CategoryLabelingConfig, ComplexityConfig, ExcludeConfig, LabelerConfig, LabelPolicyConfig, RiskConfig, RuntimeConfig, SizeConfig, } from './types/config.js';
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
