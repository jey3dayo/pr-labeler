import { Result, ResultAsync } from 'neverthrow';
import { GitHubAPIError } from '../errors/index.js';
import type { PRContext } from '../types.js';
export declare function fetchCurrentLabels(token: string, owner: string, repo: string, pullNumber: number): ResultAsync<string[], GitHubAPIError>;
export declare function getCurrentLabels(token: string, context: PRContext): Promise<Result<string[], GitHubAPIError>>;
export declare function getCurrentLabelsGraceful(token: string, context: PRContext): Promise<string[]>;
