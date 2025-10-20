import * as github from '@actions/github';
import { ResultAsync } from 'neverthrow';
import { GitHubAPIError } from './errors/index.js';
import type { LabelDecisions, LabelPolicyConfig, LabelUpdate } from './labeler-types.js';
import type { PRContext } from './types.js';
export declare function applyLabels(token: string, context: PRContext, decisions: LabelDecisions, config: LabelPolicyConfig): ResultAsync<LabelUpdate, GitHubAPIError>;
export declare function getCurrentLabels(octokit: ReturnType<typeof github.getOctokit>, context: PRContext): ResultAsync<string[], GitHubAPIError>;
