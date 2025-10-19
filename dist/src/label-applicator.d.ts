import { ResultAsync } from 'neverthrow';
import { GitHubAPIError } from './errors.js';
import type { LabelDecisions, LabelPolicyConfig, LabelUpdate } from './labeler-types.js';
import type { PRContext } from './types.js';
export declare function applyLabels(token: string, context: PRContext, decisions: LabelDecisions, config: LabelPolicyConfig): ResultAsync<LabelUpdate, GitHubAPIError>;
export declare function getCurrentLabels(token: string, context: PRContext): ResultAsync<string[], GitHubAPIError>;
