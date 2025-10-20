/**
 * PR Metrics Action - Main entry point
 * Analyzes pull request files and enforces size limits
 */

import * as github from '@actions/github';
import * as path from 'path';

import {
  getActionInputs,
  getGitHubToken,
  getPullRequestContext,
  logDebug,
  logError,
  logInfo,
  logWarning,
  setActionOutputs,
  setFailed,
  writeSummary,
  writeSummaryWithAnalysis,
} from './actions-io';
import { manageComment } from './comment-manager';
import { createComplexityAnalyzer } from './complexity-analyzer';
import { getDefaultLabelerConfig, loadConfig } from './config-loader';
import { getDiffFiles } from './diff-strategy';
import { loadDirectoryLabelerConfig } from './directory-labeler/config-loader.js';
import { decideLabelsForFiles, filterByMaxLabels } from './directory-labeler/decision-engine.js';
import { applyDirectoryLabels } from './directory-labeler/label-applicator.js';
import { isErrorWithMessage, isErrorWithTypeAndMessage } from './errors/index.js';
import { analyzeFiles } from './file-metrics';
import { mapActionInputsToConfig } from './input-mapper';
import { applyLabels } from './label-applicator';
import { decideLabels } from './label-decision-engine';
import type { PRMetrics } from './labeler-types';

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

    // Step 4.5: Check if PR is draft and should be skipped
    if (prContext.isDraft && config.skipDraftPr) {
      logInfo('⏭️  Skipping draft PR as skip_draft_pr is enabled');

      // Write summary for draft PR (if enabled)
      if (config.enableSummary) {
        await writeSummary('## ⏭️ Draft PR Skipped\n\nDraft PRのため分析をスキップしました。');
        logInfo('📊 Summary written for draft PR');
      }

      logInfo('✨ PR Metrics Action completed (skipped draft PR)');
      return;
    }

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
        headSha: prContext.headSha,
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

    // Step 7: Load PR Labeler configuration (always load for complexity analysis)
    logInfo('🔧 Loading PR Labeler configuration...');
    const labelerConfigResult = await loadConfig(token, prContext.owner, prContext.repo, prContext.headSha);
    const labelerConfig = labelerConfigResult.unwrapOr(getDefaultLabelerConfig());
    if (labelerConfigResult.isErr()) {
      logInfo('  - Using default labeler configuration');
    } else {
      logInfo('  - Loaded custom labeler configuration from .github/pr-labeler.yml');
    }

    // Step 7.6: Analyze complexity (if enabled)
    let complexityMetrics = undefined;
    if (labelerConfig.complexity.enabled) {
      logInfo('🔬 Analyzing code complexity...');
      const complexityAnalyzer = createComplexityAnalyzer();
      const complexityFiles = analysis.metrics.filesAnalyzed
        .map(f => f.path)
        .filter(p => {
          const ext = path.extname(p);
          return labelerConfig.complexity.extensions.includes(ext);
        });

      logInfo(`  - Files to analyze: ${complexityFiles.length}`);

      const complexityResult = await complexityAnalyzer.analyzeFiles(complexityFiles, {
        extensions: labelerConfig.complexity.extensions,
        exclude: labelerConfig.complexity.exclude,
      });

      if (complexityResult.isOk()) {
        complexityMetrics = complexityResult.value;
        logInfo(
          `  - Max complexity: ${complexityMetrics.maxComplexity}, Avg: ${complexityMetrics.avgComplexity}, Files: ${complexityMetrics.analyzedFiles}`,
        );
      } else if (labelerConfig.runtime.fail_on_error) {
        logError(`  - Failed to analyze complexity: ${complexityResult.error.message}`);
        setFailed('Complexity analysis failed');
      } else {
        logWarning(`  - Failed to analyze complexity: ${complexityResult.error.message}`);
      }
    }

    // Step 7.7: Apply labels (if enabled)
    if (config.applyLabels) {
      // Step 7.7.1: Decide labels with PR Labeler
      logInfo('🎯 Deciding labels based on PR metrics...');
      const prMetrics: PRMetrics = {
        totalAdditions: analysis.metrics.totalAdditions,
        files: analysis.metrics.filesAnalyzed,
        ...(complexityMetrics && { complexity: complexityMetrics }),
      };

      const labelerDecisions = decideLabels(prMetrics, labelerConfig);
      if (labelerDecisions.isOk()) {
        const decisions = labelerDecisions.value;
        logInfo(`  - Labels to add: ${decisions.labelsToAdd.join(', ') || 'none'}`);
        logInfo(`  - Labels to remove: ${decisions.labelsToRemove.join(', ') || 'none'}`);

        // Step 7.7.2: Apply labels with PR Labeler (skip in dry_run mode)
        if (labelerConfig.runtime.dry_run) {
          logInfo('✨ Dry run: skipping label API calls (decisions logged above)');
        } else {
          logInfo('✨ Applying PR Labeler decisions...');
          const applyResult = await applyLabels(
            token,
            {
              owner: prContext.owner,
              repo: prContext.repo,
              pullNumber: prContext.pullNumber,
            },
            decisions,
            labelerConfig.labels,
          );

          if (applyResult.isErr()) {
            if (applyResult.error.status === 403) {
              logWarning('  - Skipped label operations (insufficient permissions)');
            } else if (labelerConfig.runtime.fail_on_error) {
              logError(`  - Failed to apply labels: ${applyResult.error.message}`);
              setFailed('PR Labeler failed to apply labels');
            } else {
              logWarning(`  - Failed to apply labels: ${applyResult.error.message}`);
            }
          } else {
            const update = applyResult.value;
            logInfo(`  - Applied: +${update.added.length} labels, -${update.removed.length} labels`);
            logInfo(`  - API calls: ${update.apiCalls}`);
          }
        }
      }
    }

    // Step 7.8: Directory-Based Labeling (if enabled)
    if (config.enableDirectoryLabeling) {
      logInfo('🏷️ Starting Directory-Based Labeling...');

      // Step 7.8.1: Load directory labeler configuration
      const dirConfigResult = loadDirectoryLabelerConfig(config.directoryLabelerConfigPath);

      if (dirConfigResult.isErr()) {
        // 設定ファイルが存在しない場合は警告のみ
        if (dirConfigResult.error.type === 'FileSystemError') {
          logInfo(`  - Configuration file not found: ${config.directoryLabelerConfigPath}`);
          logInfo('  - Skipping directory-based labeling');
        } else {
          logWarning(`  - Failed to load configuration: ${dirConfigResult.error.message}`);
          logInfo('  - Skipping directory-based labeling');
        }
      } else {
        const dirConfig = dirConfigResult.value;

        // Actionの入力でuse_default_excludesを上書き
        dirConfig.useDefaultExcludes = config.useDefaultExcludes;

        // Step 7.8.2: Decide labels based on file paths
        const fileList = files.map(f => f.filename);
        const directoryDecisionsResult = decideLabelsForFiles(fileList, dirConfig);

        if (directoryDecisionsResult.isErr()) {
          logWarning(`  - Failed to decide labels: ${directoryDecisionsResult.error.message}`);
        } else {
          const directoryDecisions = directoryDecisionsResult.value;

          if (directoryDecisions.length === 0) {
            logInfo('  - No labels matched for changed files');
          } else {
            logInfo(`  - Decided ${directoryDecisions.length} labels from file paths`);

            // Step 7.8.3: Filter by max_labels
            const { selected, rejected } = filterByMaxLabels(directoryDecisions, config.maxLabels);

            if (rejected.length > 0) {
              logWarning(`  - Rejected ${rejected.length} labels due to max_labels limit`);
              for (const r of rejected) {
                logDebug(`    - ${r.label}: ${r.reason}`);
              }
            }

            // Step 7.8.4: Apply directory labels
            const octokit = github.getOctokit(token);
            const applyResult = await applyDirectoryLabels(
              octokit,
              {
                repo: {
                  owner: prContext.owner,
                  repo: prContext.repo,
                },
                issue: {
                  number: prContext.pullNumber,
                },
              },
              selected,
              dirConfig.namespaces || { exclusive: ['size', 'area', 'type'], additive: ['scope', 'meta'] },
              {
                autoCreate: config.autoCreateLabels,
                labelColor: config.labelColor,
                labelDescription: config.labelDescription,
              },
            );

            if (applyResult.isErr()) {
              if (applyResult.error.type === 'PermissionError') {
                logWarning(`  - Skipped label operations: ${applyResult.error.message}`);
                logWarning('  - Ensure "issues: write" permission is granted in workflow');
              } else {
                logWarning(`  - Failed to apply labels: ${applyResult.error.message}`);
              }
            } else {
              const result = applyResult.value;
              logInfo(
                `  - Applied: ${result.applied.length}, Skipped: ${result.skipped.length}, Removed: ${result.removed?.length || 0}, Failed: ${result.failed.length}`,
              );

              if (result.failed.length > 0) {
                for (const f of result.failed) {
                  logWarning(`    - ${f.label}: ${f.reason}`);
                }
              }
            }
          }
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

    // Step 8.5: Write GitHub Actions Summary (if enabled)
    if (config.enableSummary) {
      logInfo('📊 Writing GitHub Actions Summary...');
      const summaryResult = await writeSummaryWithAnalysis(
        analysis,
        {
          enableSummary: config.enableSummary,
        },
        complexityMetrics
          ? {
              metrics: complexityMetrics,
              config: labelerConfig.complexity,
              context: {
                owner: prContext.owner,
                repo: prContext.repo,
                sha: prContext.headSha,
              },
            }
          : undefined,
      );

      if (summaryResult.isErr()) {
        logWarning(`Failed to write summary: ${summaryResult.error.message}`);
        // Continue execution - summary is non-critical
      } else if (summaryResult.value.action === 'written') {
        logInfo(`  - Summary written successfully (${summaryResult.value.bytesWritten} bytes)`);
      }
    }

    // Step 9: Set outputs
    setActionOutputs({
      large_files: JSON.stringify(analysis.violations.largeFiles),
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
      setFailed('🚫 PR contains violations and fail_on_violation is enabled');
    } else {
      logInfo('✨ PR Metrics Action completed successfully');
    }
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logError(`❌ Action failed: ${errorMessage}`);
    setFailed(errorMessage);
  }
}

/**
 * Extract error message from various error types
 */
function getErrorMessage(error: unknown): string {
  if (isErrorWithTypeAndMessage(error)) {
    return `[${error.type}] ${error.message}`;
  }
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  return String(error);
}

// Run the action if this is the main module
if (require.main === module) {
  run();
}

// Export for testing
export { run };
