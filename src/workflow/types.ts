import type { CompleteConfig } from '../config-builder.js';
import type { DiffFile } from '../diff-strategy';
import type { ComplexityMetrics, LabelDecisions, LabelerConfig } from '../labeler-types';
import type { AnalysisResult } from '../types/analysis.js';

/**
 * Runtime context data extracted from the pull request payload
 */
export interface PullRequestRuntimeContext {
  owner: string;
  repo: string;
  pullNumber: number;
  baseSha: string;
  headSha: string;
  isDraft: boolean;
}

/**
 * Shared data produced during initialization stage
 */
export interface InitializationArtifacts {
  token: string;
  prContext: PullRequestRuntimeContext;
  config: CompleteConfig;
  labelerConfig: LabelerConfig;
  skipDraft: boolean;
}

/**
 * Shared data produced during analysis stage
 */
export interface AnalysisArtifacts {
  files: DiffFile[];
  analysis: AnalysisResult;
  hasViolations: boolean;
  complexityMetrics?: ComplexityMetrics;
  labelDecisions?: LabelDecisions;
}
