import * as github from '@actions/github';
import { createGitHubAPIError, createPermissionError, createRateLimitError, type Result } from '../errors/index.js';
import type { LabelDecision } from './decision-engine.js';
import type { NamespacePolicy } from './types.js';
type Octokit = ReturnType<typeof github.getOctokit>;
export interface PullRequestContext {
    repo: {
        owner: string;
        repo: string;
    };
    issue: {
        number: number;
    };
}
export interface ApplyResult {
    applied: string[];
    skipped: string[];
    removed?: string[];
    failed: Array<{
        label: string;
        reason: string;
    }>;
}
export interface ApplyOptions {
    autoCreate: boolean;
    labelColor?: string;
    labelDescription?: string;
}
export declare function applyDirectoryLabels(octokit: Octokit, context: PullRequestContext, decisions: LabelDecision[], namespaces: Required<NamespacePolicy>, options: ApplyOptions): Promise<Result<ApplyResult, ReturnType<typeof createGitHubAPIError> | ReturnType<typeof createPermissionError> | ReturnType<typeof createRateLimitError>>>;
export {};
