import { getPullRequestContext } from '../actions-io';
import type { CompleteConfig } from '../config-builder.js';
import type { DiffFile } from '../diff-strategy';
import type { ComplexityMetrics, LabelerConfig } from '../labeler-types';
import type { AnalysisResult } from '../types/analysis.js';
export interface InitializationArtifacts {
    token: string;
    prContext: ReturnType<typeof getPullRequestContext>;
    config: CompleteConfig;
    labelerConfig: LabelerConfig;
    skipDraft: boolean;
}
export interface AnalysisArtifacts {
    files: DiffFile[];
    analysis: AnalysisResult;
    hasViolations: boolean;
    complexityMetrics?: ComplexityMetrics;
}
export declare function initializeAction(): Promise<InitializationArtifacts>;
export declare function analyzePullRequest(context: InitializationArtifacts): Promise<AnalysisArtifacts>;
export declare function applyLabelsStage(context: InitializationArtifacts, artifacts: AnalysisArtifacts): Promise<void>;
export declare function finalizeAction(context: InitializationArtifacts, artifacts: AnalysisArtifacts): Promise<void>;
