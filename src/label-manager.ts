/**
 * Label management for GitHub pull requests
 * Handles size labels and violation labels
 */

import * as github from '@actions/github';
import { err, ok, Result } from 'neverthrow';

import { logDebug, logInfo, logWarning } from './actions-io';
import { AUTO_LABEL_PREFIX, VIOLATION_LABELS } from './configs/label-defaults.js';
import type { ConfigurationError, GitHubAPIError, Violations } from './errors/index.js';
import { createConfigurationError, createGitHubAPIError, ensureError } from './errors/index.js';
import type { AnalysisResult } from './file-metrics';
import type { PRContext } from './types';
import { getCurrentLabels as fetchCurrentLabels, getCurrentLabelsGraceful } from './utils/github-label-utils.js';
import { calculateSizeLabel } from './utils/size-label-utils.js';

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
  applySizeLabels?: boolean; // If false, skip size label updates
  autoRemoveLabels?: boolean; // If false, don't remove old labels
  largeFilesLabel?: string; // Custom label for large files
  tooManyFilesLabel?: string; // Custom label for too many files
  tooManyLinesLabel?: string; // Custom label for too many lines
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
 * Validate size label thresholds
 * Ensures non-negative values and monotonicity (small ≤ medium ≤ large ≤ xlarge)
 */
function validateSizeLabelThresholds(thresholds: LabelConfig['sizeLabelThresholds']): Result<void, ConfigurationError> {
  const { small, medium, large, xlarge } = thresholds;

  // Check for non-negative values
  if (small < 0 || medium < 0 || large < 0 || xlarge < 0) {
    return err(
      createConfigurationError(
        'size_label_thresholds',
        JSON.stringify(thresholds),
        'Threshold values must be non-negative',
      ),
    );
  }

  // Check for monotonicity (small ≤ medium ≤ large ≤ xlarge)
  if (small > medium || medium > large || large > xlarge) {
    return err(
      createConfigurationError(
        'size_label_thresholds',
        JSON.stringify(thresholds),
        'Thresholds must be monotonic (small ≤ medium ≤ large ≤ xlarge)',
      ),
    );
  }

  return ok(undefined);
}

/**
 * Get detail labels based on violations
 */
export function getDetailLabels(
  violations: Violations,
  customLabels?: { largeFiles?: string; tooManyFiles?: string; tooManyLines?: string },
): string[] {
  const labels: string[] = [];

  if (violations.largeFiles.length > 0) {
    labels.push(customLabels?.largeFiles || VIOLATION_LABELS.largeFiles);
  }

  if (violations.exceedsFileLines.length > 0) {
    labels.push(customLabels?.tooManyLines || VIOLATION_LABELS.tooManyLines);
  }

  if (violations.exceedsAdditions) {
    labels.push(VIOLATION_LABELS.excessiveChanges);
  }

  if (violations.exceedsFileCount) {
    labels.push(customLabels?.tooManyFiles || VIOLATION_LABELS.tooManyFiles);
  }

  return labels;
}

/**
 * Get current labels on the PR
 */
export async function getCurrentLabels(token: string, context: PRContext): Promise<Result<string[], GitHubAPIError>> {
  logDebug(`Getting current labels for PR #${context.pullNumber}`);

  const result = await fetchCurrentLabels(token, context);

  if (result.isOk()) {
    logDebug(`Found ${result.value.length} labels: ${result.value.join(', ')}`);
  }

  return result;
}

/**
 * Get current labels on the PR (Graceful Degradation version)
 * Returns undefined if label retrieval fails, allowing failure conditions
 * to be evaluated based on violations only.
 */
export async function getCurrentPRLabels(token: string, context: PRContext): Promise<string[] | undefined> {
  logDebug(`Getting current labels for PR #${context.pullNumber}`);

  const labels = await getCurrentLabelsGraceful(token, context);

  if (labels.length > 0) {
    logDebug(`Found ${labels.length} labels: ${labels.join(', ')}`);
  } else {
    logWarning('Failed to get labels (will use violations only)');
  }

  return labels.length > 0 ? labels : undefined;
}

/**
 * Label modifier function type
 */
type LabelModifier = (
  octokit: ReturnType<typeof github.getOctokit>,
  context: PRContext,
  labels: string[],
) => Promise<void>;

/**
 * Common label modification function
 * Handles empty check, logging, octokit creation, and error handling
 */
async function modifyLabels(
  labels: string[],
  token: string,
  context: PRContext,
  operation: {
    name: string;
    logMessage: (labels: string[]) => string;
    execute: LabelModifier;
  },
): Promise<Result<void, GitHubAPIError>> {
  if (labels.length === 0) {
    logDebug(`No labels to ${operation.name}`);
    return ok(undefined);
  }

  try {
    logInfo(operation.logMessage(labels));
    const octokit = github.getOctokit(token);
    await operation.execute(octokit, context, labels);
    return ok(undefined);
  } catch (error) {
    const message = ensureError(error).message;
    return err(createGitHubAPIError(`Failed to ${operation.name} labels: ${message}`));
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
  return modifyLabels(labels, token, context, {
    name: 'add',
    logMessage: lbls => `Adding labels: ${lbls.join(', ')}`,
    execute: async (octokit, ctx, lbls) => {
      await octokit.rest.issues.addLabels({
        owner: ctx.owner,
        repo: ctx.repo,
        issue_number: ctx.pullNumber,
        labels: lbls,
      });
    },
  });
}

/**
 * Remove labels from the PR
 */
export async function removeLabels(
  labels: string[],
  token: string,
  context: PRContext,
): Promise<Result<void, GitHubAPIError>> {
  return modifyLabels(labels, token, context, {
    name: 'remove',
    logMessage: lbls => `Removing labels: ${lbls.join(', ')}`,
    execute: async (octokit, ctx, lbls) => {
      // Remove each label individually (GitHub API doesn't support bulk removal)
      for (const label of lbls) {
        try {
          await octokit.rest.issues.removeLabel({
            owner: ctx.owner,
            repo: ctx.repo,
            issue_number: ctx.pullNumber,
            name: label,
          });
        } catch (error) {
          // Log warning but continue removing other labels
          logWarning(`Failed to remove label '${label}': ${ensureError(error).message}`);
        }
      }
    },
  });
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
): Promise<Result<LabelUpdate, GitHubAPIError | ConfigurationError>> {
  // Validate thresholds
  const validationResult = validateSizeLabelThresholds(config.sizeLabelThresholds);
  if (validationResult.isErr()) {
    return err(validationResult.error);
  }

  // Get current labels
  const currentLabelsResult = await getCurrentLabels(token, context);
  if (currentLabelsResult.isErr()) {
    return err(currentLabelsResult.error);
  }
  const currentLabels = currentLabelsResult.value;

  const applySizeLabels = config.applySizeLabels !== false; // Default true
  const autoRemoveLabels = config.autoRemoveLabels !== false; // Default true

  // Determine new size label (only if applySizeLabels is true)
  const newSizeLabel = applySizeLabels
    ? calculateSizeLabel(analysisResult.metrics.totalAdditions, config.sizeLabelThresholds)
    : null;

  // Determine new violation labels with custom names
  const customLabels: { largeFiles?: string; tooManyFiles?: string; tooManyLines?: string } = {};
  if (config.largeFilesLabel) {
    customLabels.largeFiles = config.largeFilesLabel;
  }
  if (config.tooManyFilesLabel) {
    customLabels.tooManyFiles = config.tooManyFilesLabel;
  }
  if (config.tooManyLinesLabel) {
    customLabels.tooManyLines = config.tooManyLinesLabel;
  }
  const newViolationLabels = getDetailLabels(analysisResult.violations, customLabels);

  // Find labels to remove (old size labels and old auto labels)
  const labelsToRemove: string[] = [];

  if (autoRemoveLabels) {
    // Remove old size labels (only if applySizeLabels is true)
    if (applySizeLabels) {
      for (const label of currentLabels) {
        // Support both old (size:) and new (size/) formats
        if ((label.startsWith('size:') || label.startsWith('size/')) && label !== newSizeLabel) {
          labelsToRemove.push(label);
        }
      }
    }

    // Remove auto labels that are no longer applicable
    for (const label of currentLabels) {
      if (label.startsWith(AUTO_LABEL_PREFIX) && !newViolationLabels.includes(label)) {
        labelsToRemove.push(label);
      }
    }
  }

  // Find labels to add
  const labelsToAdd: string[] = [];

  // Add new size label if not present (only if applySizeLabels is true)
  if (applySizeLabels && newSizeLabel && !currentLabels.includes(newSizeLabel)) {
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
  const finalLabels = currentLabels.filter(label => !labelsToRemove.includes(label)).concat(labelsToAdd);

  const result: LabelUpdate = {
    added: labelsToAdd,
    removed: labelsToRemove,
    current: finalLabels,
  };

  if (labelsToAdd.length === 0 && labelsToRemove.length === 0) {
    logInfo('No label changes needed');
  } else {
    logInfo(
      `Label update complete. Added: ${labelsToAdd.join(', ') || 'none'}. Removed: ${labelsToRemove.join(', ') || 'none'}`,
    );
  }

  return ok(result);
}
