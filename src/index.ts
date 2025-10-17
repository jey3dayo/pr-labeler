/**
 * PR Metrics Action - Main entry point
 * Analyzes pull request files and enforces size limits
 */

import * as core from '@actions/core';
import {
  getActionInputs,
  getGitHubToken,
  getPullRequestContext,
  setActionOutputs,
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
    const prContext = getPullRequestContext();

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
        fileLineLimit: config.fileLinesLimit,
        maxAddedLines: config.prAdditionsLimit,
        maxFileCount: config.prFilesLimit,
        excludePatterns: config.additionalExcludePatterns,
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
          sizeLabelThresholds: {
            small: config.sizeThresholds.S.additions,
            medium: config.sizeThresholds.M.additions,
            large: config.sizeThresholds.L.additions,
            xlarge: config.sizeThresholds.L.additions * 2,
          },
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
    if (config.commentOnPr !== 'never') {
      logInfo('💬 Managing PR comment...');
      const commentResult = await manageComment(
        analysis,
        {
          commentMode: config.commentOnPr,
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
    setActionOutputs({
      large_files: JSON.stringify(analysis.violations.largeFiles.map(v => v.file)),
      pr_additions: analysis.metrics.totalAdditions.toString(),
      pr_files: analysis.metrics.totalFiles.toString(),
      exceeds_file_size: (analysis.violations.largeFiles.length > 0).toString(),
      exceeds_file_lines: (analysis.violations.exceedsFileLines.length > 0).toString(),
      exceeds_additions: analysis.violations.exceedsAdditions.toString(),
      exceeds_file_count: analysis.violations.exceedsFileCount.toString(),
      has_violations: hasViolations.toString(),
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
