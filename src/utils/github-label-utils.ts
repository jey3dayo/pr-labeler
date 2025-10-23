/**
 * GitHub label utilities for fetching current labels
 * Shared across label-manager and label-applicator
 */

import * as github from '@actions/github';
import { Result, ResultAsync } from 'neverthrow';

import { createGitHubAPIError, ensureError, extractErrorStatus, GitHubAPIError } from '../errors/index.js';
import type { PRContext } from '../types.js';

/**
 * Fetch current labels from PR
 * Core implementation used by both label-manager and label-applicator
 *
 * @param token - GitHub API token
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param pullNumber - Pull request number
 * @returns Array of current label names or GitHubAPIError
 */
export function fetchCurrentLabels(
  token: string,
  owner: string,
  repo: string,
  pullNumber: number,
): ResultAsync<string[], GitHubAPIError> {
  const octokit = github.getOctokit(token);

  return ResultAsync.fromPromise(
    octokit.rest.issues.listLabelsOnIssue({
      owner,
      repo,
      issue_number: pullNumber,
    }),
    (error): GitHubAPIError => {
      return createGitHubAPIError(`Failed to get labels: ${ensureError(error).message}`, extractErrorStatus(error));
    },
  ).map(response => response.data.map(label => label.name));
}

/**
 * Get current labels from PR (for label-manager compatibility)
 * Wrapper that uses PRContext
 *
 * @param token - GitHub API token
 * @param context - PR context
 * @returns Array of current label names or GitHubAPIError
 */
export async function getCurrentLabels(token: string, context: PRContext): Promise<Result<string[], GitHubAPIError>> {
  const resultAsync = fetchCurrentLabels(token, context.owner, context.repo, context.pullNumber);
  return resultAsync;
}

/**
 * Get current labels with graceful degradation (for label-manager compatibility)
 * Returns empty array on errors instead of failing
 *
 * @param token - GitHub API token
 * @param context - PR context
 * @returns Array of current label names (empty on error)
 */
export async function getCurrentLabelsGraceful(token: string, context: PRContext): Promise<string[]> {
  const result = await fetchCurrentLabels(token, context.owner, context.repo, context.pullNumber);

  return result.match(
    labels => labels,
    _error => [],
  );
}
