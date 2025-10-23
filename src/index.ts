/**
 * PR Labeler - Main entry point
 * Analyzes pull request files and enforces size limits
 */

import * as path from 'node:path';

import * as github from '@actions/github';

import {
  getPullRequestContext,
  logDebug,
  logDebugI18n,
  logErrorI18n,
  logInfo,
  logInfoI18n,
  logWarning,
  logWarningI18n,
  setActionOutputs,
  setFailed,
} from './actions-io';
import { getCIStatus } from './ci-status.js';
import { manageComment } from './comment-manager';
import { createComplexityAnalyzer } from './complexity-analyzer';
import { buildCompleteConfig } from './config-builder.js';
import { getDefaultLabelerConfig, loadConfig } from './config-loader';
import { getDiffFiles } from './diff-strategy';
import { loadDirectoryLabelerConfig } from './directory-labeler/config-loader.js';
import { decideLabelsForFiles, filterByMaxLabels } from './directory-labeler/decision-engine.js';
import { applyDirectoryLabels } from './directory-labeler/label-applicator.js';
import { loadEnvironmentConfig } from './environment-loader.js';
import { isErrorWithMessage, isErrorWithTypeAndMessage } from './errors/index.js';
import { evaluateFailureConditions } from './failure-evaluator.js';
import { analyzeFiles } from './file-metrics';
import { initializeI18n, t } from './i18n.js';
import { parseActionInputs } from './input-parser.js';
import { applyLabels } from './label-applicator';
import { decideLabels } from './label-decision-engine';
import { getCurrentPRLabels } from './label-manager.js';
import { writeSummary, writeSummaryWithAnalysis } from './summary/summary-writer';
import type { PRMetrics } from './labeler-types';
import type { PRContext } from './types';

/**
 * Main action function
 */
async function run(): Promise<void> {
  try {
    // Step 1: Parse action inputs (Result<T,E>)
    logInfoI18n('initialization.gettingInputs');
    const parsedInputsResult = parseActionInputs();
    if (parsedInputsResult.isErr()) {
      throw parsedInputsResult.error; // パースエラー → 即座に失敗
    }
    const parsedInputs = parsedInputsResult.value;

    // Step 2: Get GitHub token (ParsedInputs から取得)
    const token = parsedInputs.githubToken;

    // Step 3: Get PR context
    const prContext = getPullRequestContext();

    logInfoI18n('initialization.analyzingPr', {
      prNumber: prContext.pullNumber,
      owner: prContext.owner,
      repo: prContext.repo,
    });

    // Step 4: Load environment config
    const envConfig = loadEnvironmentConfig();

    // Step 5: Load labeler config (pr-labeler.yml)
    logInfoI18n('labels.loading');
    const labelerConfigResult = await loadConfig(token, prContext.owner, prContext.repo, prContext.headSha);
    const labelerConfig = labelerConfigResult.unwrapOr(getDefaultLabelerConfig());

    // Step 6: Build complete config (優先順位解決)
    const config = buildCompleteConfig(parsedInputs, labelerConfig, envConfig);

    // Step 7: Initialize i18n (言語コードのみ)
    const i18nResult = initializeI18n(config.language);
    if (i18nResult.isErr()) {
      logWarningI18n('initialization.i18nFailed', { message: i18nResult.error.message });
      // Continue execution with English fallback
    }

    // Step 4.5: Check if PR is draft and should be skipped
    if (prContext.isDraft && config.skipDraftPr) {
      logInfoI18n('draft.skipping');

      // Write summary for draft PR (if enabled)
      if (config.enableSummary) {
        const title = t('summary', 'draftPr.title');
        const message = t('summary', 'draftPr.message');
        await writeSummary(`## ⏭️ ${title}\n\n${message}`);
        logInfoI18n('draft.summaryWritten');
      }

      logInfoI18n('completion.skippedDraft');
      return;
    }

    // Step 5: Get diff files
    logInfoI18n('analysis.gettingDiff');
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
    logInfoI18n('analysis.retrievedFiles', { count: files.length, strategy });

    // Step 6: Analyze files
    logInfoI18n('analysis.analyzingFiles');
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
    logInfoI18n('analysis.analysisComplete');
    logInfoI18n('analysis.filesAnalyzed', { count: analysis.metrics.filesAnalyzed.length });
    logInfoI18n('analysis.filesExcluded', { count: analysis.metrics.filesExcluded.length });
    logInfoI18n('analysis.binaryFilesSkipped', { count: analysis.metrics.filesSkippedBinary.length });
    logInfoI18n('analysis.totalAdditions', { count: analysis.metrics.totalAdditions });

    const hasViolations =
      analysis.violations.largeFiles.length > 0 ||
      analysis.violations.exceedsFileLines.length > 0 ||
      analysis.violations.exceedsAdditions ||
      analysis.violations.exceedsFileCount;

    if (hasViolations) {
      logWarning(`⚠️ ${t('logs', 'violations.detected')}`);
      if (analysis.violations.largeFiles.length > 0) {
        logWarningI18n('violations.largeFiles', { count: analysis.violations.largeFiles.length });
      }
      if (analysis.violations.exceedsFileLines.length > 0) {
        logWarningI18n('violations.exceedsFileLines', { count: analysis.violations.exceedsFileLines.length });
      }
      if (analysis.violations.exceedsAdditions) {
        logWarningI18n('violations.exceedsAdditions');
      }
      if (analysis.violations.exceedsFileCount) {
        logWarningI18n('violations.exceedsFileCount');
      }
    } else {
      logInfo(`✅ ${t('logs', 'violations.allChecksPassed')}`);
    }

    // Step 7.5: Merge action inputs with labeler config (inputs take priority)
    // Note: labelerConfig was already loaded in Step 5
    logInfoI18n('labels.merging');
    labelerConfig.size.enabled = config.sizeEnabled;
    labelerConfig.size.thresholds = config.sizeThresholdsV2;
    labelerConfig.complexity.enabled = config.complexityEnabled;
    labelerConfig.complexity.thresholds = config.complexityThresholdsV2;
    labelerConfig.categoryLabeling.enabled = config.categoryEnabled;
    labelerConfig.risk.enabled = config.riskEnabled;
    logDebug(
      `  - Enabled flags: size=${config.sizeEnabled}, complexity=${config.complexityEnabled}, category=${config.categoryEnabled}, risk=${config.riskEnabled}`,
    );

    // Step 7.6: Analyze complexity (if enabled)
    let complexityMetrics = undefined;
    if (labelerConfig.complexity.enabled) {
      logInfoI18n('analysis.complexityAnalyzing');
      const complexityAnalyzer = createComplexityAnalyzer();
      const complexityFiles = analysis.metrics.filesAnalyzed
        .map(f => f.path)
        .filter(p => {
          const ext = path.extname(p);
          return labelerConfig.complexity.extensions.includes(ext);
        });

      logInfoI18n('analysis.complexityFilesToAnalyze', { count: complexityFiles.length });

      const complexityResult = await complexityAnalyzer.analyzeFiles(complexityFiles, {
        extensions: labelerConfig.complexity.extensions,
        exclude: labelerConfig.complexity.exclude,
      });

      if (complexityResult.isOk()) {
        complexityMetrics = complexityResult.value;
        logInfoI18n('analysis.complexityResults', {
          max: complexityMetrics.maxComplexity,
          avg: complexityMetrics.avgComplexity,
          files: complexityMetrics.analyzedFiles,
        });
      } else if (labelerConfig.runtime.fail_on_error) {
        logErrorI18n('completion.failed', { message: complexityResult.error.message });
        setFailed('Complexity analysis failed');
      } else {
        logWarningI18n('analysis.complexityFailed', { message: complexityResult.error.message });
      }
    }

    // Step 7.7: Apply labels
    // Step 7.7.1: Decide labels with PR Labeler
    logInfoI18n('labels.decidingLabels');
    const prMetrics: PRMetrics = {
      totalAdditions: analysis.metrics.totalAdditions,
      files: analysis.metrics.filesAnalyzed,
      ...(complexityMetrics && { complexity: complexityMetrics }),
    };

    // Build extended PR context for risk evaluation
    const octokit = github.getOctokit(token);
    const extendedPRContext: PRContext = {
      owner: prContext.owner,
      repo: prContext.repo,
      pullNumber: prContext.pullNumber,
    };

    // Fetch CI status if enabled (default true when undefined)
    const useCiStatus = labelerConfig.risk.use_ci_status ?? true;
    if (useCiStatus) {
      logInfoI18n('ciStatus.fetching');
      const ciStatus = await getCIStatus(octokit, prContext.owner, prContext.repo, prContext.headSha);
      if (ciStatus) {
        extendedPRContext.ciStatus = ciStatus;
        logInfoI18n('ciStatus.status', {
          tests: ciStatus.tests,
          typeCheck: ciStatus.typeCheck,
          build: ciStatus.build,
          lint: ciStatus.lint,
        });
      } else {
        logInfoI18n('ciStatus.notAvailable');
      }

      // Fetch commit messages with pagination (subject line only)
      try {
        const commits = await octokit.paginate(octokit.rest.pulls.listCommits, {
          owner: prContext.owner,
          repo: prContext.repo,
          pull_number: prContext.pullNumber,
          per_page: 100,
        });
        const messages: string[] = [];
        for (const commit of commits) {
          const msg = commit.commit.message;
          if (msg !== null && msg !== undefined) {
            const subject = msg.split('\n')[0];
            if (subject) {
              messages.push(subject);
            }
          }
        }
        extendedPRContext.commitMessages = messages;
        logInfoI18n('ciStatus.fetchedCommits', { count: messages.length });
      } catch (_error) {
        logInfoI18n('ciStatus.fetchCommitsFailed');
      }
    }

    const labelerDecisions = decideLabels(prMetrics, labelerConfig, extendedPRContext);
    if (labelerDecisions.isOk()) {
      const decisions = labelerDecisions.value;
      logInfoI18n('labels.labelsToAdd', { labels: decisions.labelsToAdd.join(', ') || 'none' });
      logInfoI18n('labels.labelsToRemove', { labels: decisions.labelsToRemove.join(', ') || 'none' });

      // Step 7.7.2: Apply labels with PR Labeler (skip in dry_run mode)
      if (labelerConfig.runtime.dry_run) {
        logInfoI18n('labels.dryRun');
      } else {
        logInfoI18n('labels.applying');
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
            logWarningI18n('labels.skipped');
          } else if (labelerConfig.runtime.fail_on_error) {
            logErrorI18n('labels.applyFailed', { message: applyResult.error.message });
            setFailed(t('logs', 'completion.failed', { message: 'Failed to apply labels' }));
          } else {
            logWarningI18n('labels.applyFailed', { message: applyResult.error.message });
          }
        } else {
          const update = applyResult.value;
          logInfoI18n('labels.applied', { added: update.added.length, removed: update.removed.length });
          logInfoI18n('labels.apiCalls', { count: update.apiCalls });
        }
      }
    }

    // Step 7.8: Directory-Based Labeling (if enabled)
    if (config.enableDirectoryLabeling) {
      logInfoI18n('directoryLabeling.starting');

      // Step 7.8.1: Load directory labeler configuration
      const dirConfigResult = loadDirectoryLabelerConfig(config.directoryLabelerConfigPath);

      if (dirConfigResult.isErr()) {
        // 設定ファイルが存在しない場合は警告のみ
        if (dirConfigResult.error.type === 'FileSystemError') {
          logInfoI18n('directoryLabeling.configNotFound', { path: config.directoryLabelerConfigPath });
          logInfoI18n('directoryLabeling.skipped');
        } else {
          logWarningI18n('directoryLabeling.configLoadFailed', { message: dirConfigResult.error.message });
          logInfoI18n('directoryLabeling.skipped');
        }
      } else {
        const dirConfig = dirConfigResult.value;

        // Actionの入力でuse_default_excludesを上書き
        dirConfig.useDefaultExcludes = config.useDefaultExcludes;

        // Step 7.8.2: Decide labels based on file paths
        const fileList = files.map(f => f.filename);
        const directoryDecisionsResult = decideLabelsForFiles(fileList, dirConfig);

        if (directoryDecisionsResult.isErr()) {
          logWarningI18n('directoryLabeling.decideFailed', { message: directoryDecisionsResult.error.message });
        } else {
          const directoryDecisions = directoryDecisionsResult.value;

          if (directoryDecisions.length === 0) {
            logInfoI18n('directoryLabeling.noLabelsMatched');
          } else {
            logInfoI18n('directoryLabeling.decided', { count: directoryDecisions.length });

            // Step 7.8.3: Filter by max_labels
            const { selected, rejected } = filterByMaxLabels(directoryDecisions, config.maxLabels);

            if (rejected.length > 0) {
              logWarningI18n('directoryLabeling.rejected', { count: rejected.length });
              for (const r of rejected) {
                logDebugI18n('directoryLabeling.rejectedDetail', { label: r.label, reason: r.reason });
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
            );

            if (applyResult.isErr()) {
              if (applyResult.error.type === 'PermissionError') {
                logWarningI18n('directoryLabeling.permissionError', { message: applyResult.error.message });
                logWarningI18n('directoryLabeling.permissionHint');
              } else {
                logWarningI18n('directoryLabeling.applyFailed', { message: applyResult.error.message });
              }
            } else {
              const result = applyResult.value;
              logInfoI18n('directoryLabeling.applyResult', {
                applied: result.applied.length,
                skipped: result.skipped.length,
                removed: result.removed?.length || 0,
                failed: result.failed.length,
              });

              if (result.failed.length > 0) {
                for (const f of result.failed) {
                  logWarningI18n('directoryLabeling.failedDetail', { label: f.label, reason: f.reason });
                }
              }
            }
          }
        }
      }
    }

    // Step 8: Manage comment (if enabled)
    if (config.commentOnPr !== 'never') {
      logInfoI18n('comment.managing');
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
        logWarningI18n('comment.manageFailed', { message: commentResult.error.message });
      } else {
        const { action } = commentResult.value;
        logInfoI18n('comment.action', { action });
      }
    }

    // Step 8.5: Write GitHub Actions Summary (if enabled)
    if (config.enableSummary) {
      logInfoI18n('summary.writing');

      // Collect disabled label types
      const disabledFeatures: string[] = [];
      if (!labelerConfig.size.enabled) {
        disabledFeatures.push('size');
      }
      if (!labelerConfig.complexity.enabled) {
        disabledFeatures.push('complexity');
      }
      if (!labelerConfig.categoryLabeling.enabled) {
        disabledFeatures.push('category');
      }
      if (!labelerConfig.risk.enabled) {
        disabledFeatures.push('risk');
      }

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
        { disabledFeatures },
      );

      if (summaryResult.isErr()) {
        logWarningI18n('summary.writeFailed', { message: summaryResult.error.message });
        // Continue execution - summary is non-critical
      } else if (summaryResult.value.action === 'written') {
        logInfoI18n('summary.written', { bytes: summaryResult.value.bytesWritten });
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

    // Step 10: Evaluate failure conditions based on labels and violations
    const appliedLabels = await getCurrentPRLabels(token, {
      owner: prContext.owner,
      repo: prContext.repo,
      pullNumber: prContext.pullNumber,
    });

    const failures = evaluateFailureConditions({
      config,
      appliedLabels,
      violations: analysis.violations,
      metrics: {
        totalAdditions: analysis.metrics.totalAdditions,
      },
      sizeThresholds: config.sizeThresholdsV2,
    });

    if (failures.length > 0) {
      const failMessage = failures.join(', ');
      setFailed(`🚫 ${failMessage}`);
    } else {
      logInfoI18n('completion.success');
    }
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logErrorI18n('completion.failed', { message: errorMessage });
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
