/**
 * PR Metrics Action - Main entry point
 * Analyzes pull request files and enforces size limits
 */

import * as core from '@actions/core';
import {
  getActionInputs,
  getGitHubToken,
  getPullRequestContext,
  setOutputs,
  logInfo,
  logError,
  logWarning,
} from './actions-io';
import { mapActionInputsToConfig } from './input-mapper';
import { getDiffFiles } from './diff-strategy';
import { analyzeFiles } from './file-metrics';
import { updateLabels } from './label-manager';
import { manageComment } from './comment-manager';
import type { AppError } from './errors';

/**
 * Main action function
 */
async function run(): Promise<void> {
  try {
    logInfo('🚀 Starting PR Metrics Action');

    // Step 1: Get and validate inputs
    logInfo('📥 Getting action inputs...');
    const inputs = getActionInputs();

    // Step 2: Get GitHub token
    const tokenResult = getGitHubToken();
    if (tokenResult.isErr()) {
      throw tokenResult.error;
    }
    const token = tokenResult.value;

    // Step 3: Get PR context
    const contextResult = getPullRequestContext();
    if (contextResult.isErr()) {
      // Check if it's a draft PR and skip_draft is enabled
      if (inputs.skip_draft && contextResult.error.message.includes('draft')) {
        logInfo('📝 Draft PR detected and skip_draft is enabled. Skipping analysis.');
        setOutputs({
          totalAdditions: 0,
          totalFiles: 0,
          hasViolations: false,
          largeFiles: [],
          exceedsAdditions: false,
          exceedsFileCount: false,
          exceedsFileLines: [],
          sizeLabel: '',
        });
        return;
      }
      throw contextResult.error;
    }
    const prContext = contextResult.value;

    logInfo(`📋 Analyzing PR #${prContext.pullNumber} in ${prContext.owner}/${prContext.repo}`);

    // Step 4: Map inputs to configuration
    const configResult = mapActionInputsToConfig(inputs);
    if (configResult.isErr()) {
      throw configResult.error;
    }
    const config = configResult.value;

    // Step 5: Get diff files
    logInfo('📊 Getting PR diff files...');
    const diffResult = await getDiffFiles(
      {
        owner: prContext.owner,
        repo: prContext.repo,
        pullNumber: prContext.pullNumber,
        baseSha: prContext.baseSha,
        headSha: prContext.headSha,
      },
      token,
    );
    if (diffResult.isErr()) {
      throw diffResult.error;
    }
    const { files, strategy } = diffResult.value;
    logInfo(`✅ Retrieved ${files.length} files using ${strategy} strategy`);

    // Step 6: Analyze files
    logInfo('🔍 Analyzing files...');
    const analysisResult = await analyzeFiles(
      files,
      {
        fileSizeLimit: config.fileSizeLimit,
        fileLineLimit: config.fileLineLimit,
        maxAddedLines: config.maxAddedLines,
        maxFileCount: config.maxFileCount,
        excludePatterns: config.excludePatterns,
      },
      token,
      {
        owner: prContext.owner,
        repo: prContext.repo,
      },
    );
    if (analysisResult.isErr()) {
      throw analysisResult.error;
    }
    const analysis = analysisResult.value;

    // Log analysis summary
    logInfo('📈 Analysis complete:');
    logInfo(`  - Files analyzed: ${analysis.metrics.filesAnalyzed.length}`);
    logInfo(`  - Files excluded: ${analysis.metrics.filesExcluded.length}`);
    logInfo(`  - Binary files skipped: ${analysis.metrics.filesSkippedBinary.length}`);
    logInfo(`  - Total additions: ${analysis.metrics.totalAdditions}`);

    const hasViolations =
      analysis.violations.largeFiles.length > 0 ||
      analysis.violations.exceedsFileLines.length > 0 ||
      analysis.violations.exceedsAdditions ||
      analysis.violations.exceedsFileCount;

    if (hasViolations) {
      logWarning('⚠️ Violations detected:');
      if (analysis.violations.largeFiles.length > 0) {
        logWarning(`  - ${analysis.violations.largeFiles.length} large file(s)`);
      }
      if (analysis.violations.exceedsFileLines.length > 0) {
        logWarning(`  - ${analysis.violations.exceedsFileLines.length} file(s) exceed line limit`);
      }
      if (analysis.violations.exceedsAdditions) {
        logWarning('  - Total additions exceed limit');
      }
      if (analysis.violations.exceedsFileCount) {
        logWarning('  - File count exceeds limit');
      }
    } else {
      logInfo('✅ All checks passed!');
    }

    // Step 7: Update labels (if enabled)
    if (config.applyLabels) {
      logInfo('🏷️ Updating PR labels...');
      const labelResult = await updateLabels(
        analysis,
        {
          sizeLabelThresholds: config.sizeLabelThresholds,
        },
        token,
        {
          owner: prContext.owner,
          repo: prContext.repo,
          pullNumber: prContext.pullNumber,
        },
      );
      if (labelResult.isErr()) {
        logWarning(`Failed to update labels: ${labelResult.error.message}`);
      } else {
        const { added, removed } = labelResult.value;
        if (added.length > 0) {
          logInfo(`  - Added labels: ${added.join(', ')}`);
        }
        if (removed.length > 0) {
          logInfo(`  - Removed labels: ${removed.join(', ')}`);
        }
      }
    }

    // Step 8: Manage comment (if enabled)
    if (config.commentMode !== 'never') {
      logInfo('💬 Managing PR comment...');
      const commentResult = await manageComment(
        analysis,
        {
          commentMode: config.commentMode,
        },
        token,
        {
          owner: prContext.owner,
          repo: prContext.repo,
          pullNumber: prContext.pullNumber,
        },
      );
      if (commentResult.isErr()) {
        logWarning(`Failed to manage comment: ${commentResult.error.message}`);
      } else {
        const { action } = commentResult.value;
        logInfo(`  - Comment ${action}`);
      }
    }

    // Step 9: Set outputs
    const sizeLabel = getSizeLabel(analysis.metrics.totalAdditions, config.sizeLabelThresholds);
    setOutputs({
      totalAdditions: analysis.metrics.totalAdditions,
      totalFiles: analysis.metrics.totalFiles,
      hasViolations,
      largeFiles: analysis.violations.largeFiles.map(v => v.file),
      exceedsAdditions: analysis.violations.exceedsAdditions,
      exceedsFileCount: analysis.violations.exceedsFileCount,
      exceedsFileLines: analysis.violations.exceedsFileLines.map(v => v.file),
      sizeLabel,
    });

    // Step 10: Fail if violations and fail_on_violation is true
    if (hasViolations && config.failOnViolation) {
      core.setFailed('🚫 PR contains violations and fail_on_violation is enabled');
    } else {
      logInfo('✨ PR Metrics Action completed successfully');
    }
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logError(`❌ Action failed: ${errorMessage}`);
    core.setFailed(errorMessage);
  }
}

/**
 * Get size label helper (imported from label-manager)
 */
function getSizeLabel(
  totalAdditions: number,
  thresholds: { small: number; medium: number; large: number; xlarge: number },
): string {
  if (totalAdditions <= thresholds.small) {
    return 'size:S';
  } else if (totalAdditions <= thresholds.medium) {
    return 'size:M';
  } else if (totalAdditions <= thresholds.large) {
    return 'size:L';
  } else if (totalAdditions <= thresholds.xlarge) {
    return 'size:XL';
  } else {
    return 'size:XXL';
  }
}

/**
 * Extract error message from various error types
 */
function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  if (error && typeof error === 'object' && 'type' in error) {
    const appError = error as AppError;
    return `[${appError.type}] ${appError.message}`;
  }
  return String(error);
}

// Run the action if this is the main module
if (require.main === module) {
  run();
}

// Export for testing
export { run };