/**
 * Label management for GitHub pull requests
 * Handles size labels and violation labels
 */

import { Result, ok, err } from 'neverthrow';
import * as github from '@actions/github';
import { createGitHubAPIError } from './errors';
import { logInfo, logWarning, logDebug } from './actions-io';
import type { GitHubAPIError, Violations } from './errors';
import type { AnalysisResult } from './file-metrics';

/**
 * Label configuration
 */
export interface LabelConfig {
  sizeLabelThresholds: {
    small: number;
    medium: number;
    large: number;
    xlarge: number;
  };
}

/**
 * Label update result
 */
export interface LabelUpdate {
  added: string[];
  removed: string[];
  current: string[];
}

/**
 * PR context for label operations
 */
interface PRContext {
  owner: string;
  repo: string;
  pullNumber: number;
}

// Size label prefixes
const SIZE_LABEL_PREFIX = 'size:';
const AUTO_LABEL_PREFIX = 'auto:';

// Size label values
const SIZE_LABELS = {
  S: 'size:S',
  M: 'size:M',
  L: 'size:L',
  XL: 'size:XL',
  XXL: 'size:XXL',
};

// Violation label mappings
const VIOLATION_LABELS = {
  largeFiles: 'auto:large-files',
  tooManyLines: 'auto:too-many-lines',
  excessiveChanges: 'auto:excessive-changes',
  tooManyFiles: 'auto:too-many-files',
};

/**
 * Determine the size label based on total additions
 */
export function getSizeLabel(totalAdditions: number, thresholds: LabelConfig['sizeLabelThresholds']): string {
  if (totalAdditions <= thresholds.small) {
    return SIZE_LABELS.S;
  } else if (totalAdditions <= thresholds.medium) {
    return SIZE_LABELS.M;
  } else if (totalAdditions <= thresholds.large) {
    return SIZE_LABELS.L;
  } else if (totalAdditions <= thresholds.xlarge) {
    return SIZE_LABELS.XL;
  } else {
    return SIZE_LABELS.XXL;
  }
}

/**
 * Get detail labels based on violations
 */
export function getDetailLabels(violations: Violations): string[] {
  const labels: string[] = [];

  if (violations.largeFiles.length > 0) {
    labels.push(VIOLATION_LABELS.largeFiles);
  }

  if (violations.exceedsFileLines.length > 0) {
    labels.push(VIOLATION_LABELS.tooManyLines);
  }

  if (violations.exceedsAdditions) {
    labels.push(VIOLATION_LABELS.excessiveChanges);
  }

  if (violations.exceedsFileCount) {
    labels.push(VIOLATION_LABELS.tooManyFiles);
  }

  return labels;
}

/**
 * Get current labels on the PR
 */
export async function getCurrentLabels(
  token: string,
  context: PRContext,
): Promise<Result<string[], GitHubAPIError>> {
  try {
    logDebug(`Getting current labels for PR #${context.pullNumber}`);

    const octokit = github.getOctokit(token);
    const response = await octokit.rest.issues.listLabelsOnIssue({
      owner: context.owner,
      repo: context.repo,
      issue_number: context.pullNumber,
    });

    const labels = response.data.map(label => label.name);
    logDebug(`Found ${labels.length} labels: ${labels.join(', ')}`);

    return ok(labels);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return err(createGitHubAPIError(`Failed to get labels: ${message}`));
  }
}

/**
 * Add labels to the PR
 */
export async function addLabels(
  labels: string[],
  token: string,
  context: PRContext,
): Promise<Result<void, GitHubAPIError>> {
  if (labels.length === 0) {
    logDebug('No labels to add');
    return ok(undefined);
  }

  try {
    logInfo(`Adding labels: ${labels.join(', ')}`);

    const octokit = github.getOctokit(token);
    await octokit.rest.issues.addLabels({
      owner: context.owner,
      repo: context.repo,
      issue_number: context.pullNumber,
      labels,
    });

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return err(createGitHubAPIError(`Failed to add labels: ${message}`));
  }
}

/**
 * Remove labels from the PR
 */
export async function removeLabels(
  labels: string[],
  token: string,
  context: PRContext,
): Promise<Result<void, GitHubAPIError>> {
  if (labels.length === 0) {
    logDebug('No labels to remove');
    return ok(undefined);
  }

  try {
    logInfo(`Removing labels: ${labels.join(', ')}`);

    const octokit = github.getOctokit(token);

    // Remove each label individually (GitHub API doesn't support bulk removal)
    for (const label of labels) {
      try {
        await octokit.rest.issues.removeLabel({
          owner: context.owner,
          repo: context.repo,
          issue_number: context.pullNumber,
          name: label,
        });
      } catch (error) {
        // Log warning but continue removing other labels
        logWarning(`Failed to remove label '${label}': ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return err(createGitHubAPIError(`Failed to remove labels: ${message}`));
  }
}

/**
 * Update labels based on analysis results
 * Ensures idempotency - only adds/removes what's necessary
 */
export async function updateLabels(
  analysisResult: AnalysisResult,
  config: LabelConfig,
  token: string,
  context: PRContext,
): Promise<Result<LabelUpdate, GitHubAPIError>> {
  // Get current labels
  const currentLabelsResult = await getCurrentLabels(token, context);
  if (currentLabelsResult.isErr()) {
    return err(currentLabelsResult.error);
  }
  const currentLabels = currentLabelsResult.value;

  // Determine new size label
  const newSizeLabel = getSizeLabel(analysisResult.metrics.totalAdditions, config.sizeLabelThresholds);

  // Determine new violation labels
  const newViolationLabels = getDetailLabels(analysisResult.violations);

  // Find labels to remove (old size labels and old auto labels)
  const labelsToRemove: string[] = [];

  // Remove old size labels
  for (const label of currentLabels) {
    if (label.startsWith(SIZE_LABEL_PREFIX) && label !== newSizeLabel) {
      labelsToRemove.push(label);
    }
    // Remove auto labels that are no longer applicable
    if (label.startsWith(AUTO_LABEL_PREFIX) && !newViolationLabels.includes(label)) {
      labelsToRemove.push(label);
    }
  }

  // Find labels to add
  const labelsToAdd: string[] = [];

  // Add new size label if not present
  if (!currentLabels.includes(newSizeLabel)) {
    labelsToAdd.push(newSizeLabel);
  }

  // Add new violation labels
  for (const label of newViolationLabels) {
    if (!currentLabels.includes(label)) {
      labelsToAdd.push(label);
    }
  }

  // Apply changes
  if (labelsToRemove.length > 0) {
    const removeResult = await removeLabels(labelsToRemove, token, context);
    if (removeResult.isErr()) {
      logWarning(`Failed to remove some labels, continuing...`);
    }
  }

  if (labelsToAdd.length > 0) {
    const addResult = await addLabels(labelsToAdd, token, context);
    if (addResult.isErr()) {
      return err(addResult.error);
    }
  }

  // Calculate final label list
  const finalLabels = currentLabels
    .filter(label => !labelsToRemove.includes(label))
    .concat(labelsToAdd);

  const result: LabelUpdate = {
    added: labelsToAdd,
    removed: labelsToRemove,
    current: finalLabels,
  };

  if (labelsToAdd.length === 0 && labelsToRemove.length === 0) {
    logInfo('No label changes needed');
  } else {
    logInfo(`Label update complete. Added: ${labelsToAdd.join(', ') || 'none'}. Removed: ${labelsToRemove.join(', ') || 'none'}`);
  }

  return ok(result);
}