/**
 * Label Applicator for PR Labeler
 * Applies label decisions to GitHub PRs with idempotency guarantee
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { ResultAsync } from 'neverthrow';

import { createGitHubAPIError, extractErrorMessage, GitHubAPIError } from './errors.js';
import type { LabelDecisions, LabelPolicyConfig, LabelUpdate } from './labeler-types.js';
import type { PRContext } from './types.js';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

/**
 * Apply label decisions to PR with idempotency guarantee
 *
 * @param token - GitHub API token
 * @param context - PR context (owner, repo, pullNumber)
 * @param decisions - Label decisions (labels to add/remove)
 * @param config - Label policy configuration
 * @returns LabelUpdate with applied changes or GitHubAPIError
 */
export function applyLabels(
  token: string,
  context: PRContext,
  decisions: LabelDecisions,
  config: LabelPolicyConfig,
): ResultAsync<LabelUpdate, GitHubAPIError> {
  const octokit = github.getOctokit(token);

  // Get current labels
  return getCurrentLabels(octokit, context).andThen(currentLabels => {
    // Calculate diff based on namespace policies
    const diff = calculateLabelDiff(decisions, currentLabels, config.namespace_policies);

    core.info(`Label diff: +${diff.toAdd.length} labels, -${diff.toRemove.length} labels`);

    // Track API calls
    const apiCalls = 1; // getCurrentLabels

    // Apply changes
    return applyLabelChanges(octokit, context, diff, config.create_missing).map(result => ({
      added: result.added,
      removed: result.removed,
      skipped: result.skipped,
      apiCalls: apiCalls + result.apiCalls,
    }));
  });
}

/**
 * Get current labels from PR
 *
 * @param octokit - GitHub API client
 * @param context - PR context
 * @returns Array of current label names or GitHubAPIError
 */
export function getCurrentLabels(
  octokit: ReturnType<typeof github.getOctokit>,
  context: PRContext,
): ResultAsync<string[], GitHubAPIError> {
  return ResultAsync.fromPromise(
    octokit.rest.issues.listLabelsOnIssue({
      owner: context.owner,
      repo: context.repo,
      issue_number: context.pullNumber,
    }),
    (error): GitHubAPIError => {
      const err = error as { status?: number; message?: string };
      return createGitHubAPIError(`Failed to get current labels: ${extractErrorMessage(error)}`, err.status);
    },
  ).map(response => response.data.map(label => label.name));
}

/**
 * Calculate label diff based on decisions and current labels
 *
 * @param decisions - Label decisions
 * @param currentLabels - Current labels on PR
 * @param policies - Namespace policies
 * @returns Diff with labels to add and remove
 */
function calculateLabelDiff(
  decisions: LabelDecisions,
  currentLabels: string[],
  policies: Record<string, 'replace' | 'additive'>,
): { toAdd: string[]; toRemove: string[] } {
  const toAdd: string[] = [];
  const toRemove: string[] = [];

  // For replace policies, remove existing labels in those namespaces
  for (const label of decisions.labelsToAdd) {
    const namespace = extractNamespace(label);
    if (namespace) {
      // Check if this namespace has a replace policy
      for (const [policyPattern, policy] of Object.entries(policies)) {
        if (policy === 'replace' && matchesNamespacePattern(namespace, policyPattern)) {
          // Remove all existing labels in this namespace
          for (const currentLabel of currentLabels) {
            const currentNamespace = extractNamespace(currentLabel);
            if (currentNamespace && matchesNamespacePattern(currentNamespace, policyPattern)) {
              if (currentLabel !== label && !toRemove.includes(currentLabel)) {
                toRemove.push(currentLabel);
              }
            }
          }
        }
      }
    }

    // Add label if not present
    if (!currentLabels.includes(label)) {
      toAdd.push(label);
    }
  }

  return { toAdd, toRemove };
}

/**
 * Apply label changes to PR
 *
 * @param octokit - GitHub API client
 * @param context - PR context
 * @param diff - Labels to add and remove
 * @param createMissing - Whether to create missing labels
 * @returns Result of label operations
 */
function applyLabelChanges(
  octokit: ReturnType<typeof github.getOctokit>,
  context: PRContext,
  diff: { toAdd: string[]; toRemove: string[] },
  _createMissing: boolean, // Future extension: auto-create missing labels
): ResultAsync<{ added: string[]; removed: string[]; skipped: string[]; apiCalls: number }, GitHubAPIError> {
  let apiCalls = 0;
  const added: string[] = [];
  const removed: string[] = [];
  const skipped: string[] = [];

  // Helper function to add labels with retry
  const addLabelsWithRetry = async (): Promise<void> => {
    if (diff.toAdd.length === 0) {
      return;
    }

    await retryWithBackoff(async () => {
      await octokit.rest.issues.addLabels({
        owner: context.owner,
        repo: context.repo,
        issue_number: context.pullNumber,
        labels: diff.toAdd,
      });
      apiCalls++;
      added.push(...diff.toAdd);
      core.info(`Added labels: ${diff.toAdd.join(', ')}`);
    });
  };

  // Helper function to remove labels with retry
  const removeLabelsWithRetry = async (): Promise<void> => {
    for (const label of diff.toRemove) {
      await retryWithBackoff(async () => {
        await octokit.rest.issues.removeLabel({
          owner: context.owner,
          repo: context.repo,
          issue_number: context.pullNumber,
          name: label,
        });
        apiCalls++;
        removed.push(label);
        core.info(`Removed label: ${label}`);
      });
    }
  };

  // Execute label operations: remove first, then add
  return ResultAsync.fromPromise(
    (async () => {
      // Remove labels first
      await removeLabelsWithRetry();

      // Add labels
      await addLabelsWithRetry();

      return { added, removed, skipped, apiCalls };
    })(),
    (error): GitHubAPIError => {
      const err = error as { status?: number; message?: string };

      // Handle permission errors
      if (err.status === 403) {
        core.warning('Insufficient permissions to apply labels (fork PR or missing pull-requests: write permission)');
        skipped.push(...diff.toAdd);
        return createGitHubAPIError('Permission denied: cannot apply labels', 403);
      }

      return createGitHubAPIError(`Failed to apply labels: ${extractErrorMessage(error)}`, err.status);
    },
  );
}

/**
 * Retry function with exponential backoff
 *
 * @param fn - Async function to retry
 * @param maxRetries - Maximum retry attempts
 * @returns Result of function execution
 */
async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries: number = MAX_RETRIES): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const err = error as { status?: number };
      if (isRateLimitError(err) && i < maxRetries - 1) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, i); // 1s, 2s, 4s
        core.warning(`Rate limit hit, retrying in ${delay}ms (attempt ${i + 1}/${maxRetries})...`);
        await sleep(delay);
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Check if error is a rate limit error
 *
 * @param error - Error object
 * @returns True if rate limit error
 */
function isRateLimitError(error: {
  status?: number;
  message?: string;
  response?: { headers?: Record<string, string> };
}): boolean {
  if (error.status === 429) {
    return true;
  }

  // GitHub secondary rate limits frequently use 403
  if (error.status === 403) {
    const hdrs = error.response?.headers || {};
    return hdrs['x-ratelimit-remaining'] === '0' || /rate limit|abuse detection/i.test(error.message || '');
  }

  return false;
}

/**
 * Sleep for specified milliseconds
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract namespace from label (e.g., "size/small" -> "size")
 *
 * @param label - Full label name
 * @returns Namespace or null if no slash found
 */
function extractNamespace(label: string): string | null {
  const slashIndex = label.indexOf('/');
  if (slashIndex === -1) {
    return null;
  }
  return label.substring(0, slashIndex);
}

/**
 * Check if namespace matches a pattern (supports wildcard)
 *
 * @param namespace - Namespace string (e.g., "size")
 * @param pattern - Pattern string (e.g., "size/*" or "size")
 * @returns True if namespace matches pattern
 */
function matchesNamespacePattern(namespace: string, pattern: string): boolean {
  // Remove trailing /* if present
  const normalizedPattern = pattern.endsWith('/*') ? pattern.slice(0, -2) : pattern;
  return namespace === normalizedPattern;
}
