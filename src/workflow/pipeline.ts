/**
 * Action workflow pipeline
 * 分割されたステージごとに PR Labeler の処理を実行
 */

import * as path from 'node:path';

import * as github from '@actions/github';
import type { Result } from 'neverthrow';

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
} from '../actions-io';
import { getCIStatus } from '../ci-status.js';
import { manageComment } from '../comment-manager';
import { createComplexityAnalyzer } from '../complexity-analyzer';
import type { CompleteConfig } from '../config-builder.js';
import { buildCompleteConfig } from '../config-builder.js';
import { getDefaultLabelerConfig, loadConfig } from '../config-loader';
import type { DiffFile } from '../diff-strategy';
import { getDiffFiles } from '../diff-strategy';
import { loadDirectoryLabelerConfig } from '../directory-labeler/config-loader.js';
import { decideLabelsForFiles, filterByMaxLabels } from '../directory-labeler/decision-engine.js';
import { applyDirectoryLabels } from '../directory-labeler/label-applicator.js';
import { loadEnvironmentConfig } from '../environment-loader.js';
import { analyzeFiles } from '../file-metrics';
import { initializeI18n, t } from '../i18n.js';
import { parseActionInputs } from '../input-parser.js';
import { applyLabels } from '../label-applicator';
import { decideLabels } from '../label-decision-engine';
import { getCurrentPRLabels } from '../label-manager.js';
import type { ComplexityMetrics, LabelerConfig, PRMetrics } from '../labeler-types';
import type { SummaryWriteResult } from '../summary/summary-writer';
import { writeSummaryWithAnalysis } from '../summary/summary-writer';
import type { PRContext } from '../types';
import type { AnalysisResult } from '../types/analysis.js';
import { evaluatePRFailures } from './policy/pr-failure-evaluator';

/**
 * Pull Request execution context
 */
export interface InitializationArtifacts {
  token: string;
  prContext: ReturnType<typeof getPullRequestContext>;
  config: CompleteConfig;
  labelerConfig: LabelerConfig;
  skipDraft: boolean;
}

/**
 * Analysis stage artifacts
 */
export interface AnalysisArtifacts {
  files: DiffFile[];
  analysis: AnalysisResult;
  hasViolations: boolean;
  complexityMetrics?: ComplexityMetrics;
}

/**
 * Initialize action inputs, configuration, and i18n
 */
export async function initializeAction(): Promise<InitializationArtifacts> {
  logInfoI18n('initialization.gettingInputs');
  const parsedInputsResult = parseActionInputs();
  if (parsedInputsResult.isErr()) {
    throw parsedInputsResult.error;
  }
  const parsedInputs = parsedInputsResult.value;

  const token = parsedInputs.githubToken;
  const prContext = getPullRequestContext();

  logInfoI18n('initialization.analyzingPr', {
    prNumber: prContext.pullNumber,
    owner: prContext.owner,
    repo: prContext.repo,
  });

  const envConfig = loadEnvironmentConfig();

  logInfoI18n('labels.loading');
  const labelerConfigResult = await loadConfig(token, prContext.owner, prContext.repo, prContext.headSha);
  const labelerConfig = labelerConfigResult.unwrapOr(getDefaultLabelerConfig());

  const config = buildCompleteConfig(parsedInputs, labelerConfig, envConfig);

  const i18nResult = initializeI18n(config.language);
  if (i18nResult.isErr()) {
    logWarningI18n('initialization.i18nFailed', { message: i18nResult.error.message });
  }

  const skipDraft = prContext.isDraft && config.skipDraftPr;

  return {
    token,
    prContext,
    config,
    labelerConfig,
    skipDraft,
  };
}

/**
 * Analyze diff files and optional complexity metrics
 */
export async function analyzePullRequest(context: InitializationArtifacts): Promise<AnalysisArtifacts> {
  const { token, prContext, config, labelerConfig } = context;

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

  // Apply action input overrides to labeler config
  labelerConfig.size.enabled = config.sizeEnabled;
  labelerConfig.size.thresholds = config.sizeThresholdsV2;
  labelerConfig.complexity.enabled = config.complexityEnabled;
  labelerConfig.complexity.thresholds = config.complexityThresholdsV2;
  labelerConfig.categoryLabeling.enabled = config.categoryEnabled;
  labelerConfig.risk.enabled = config.riskEnabled;
  logDebug(
    `  - Enabled flags: size=${config.sizeEnabled}, complexity=${config.complexityEnabled}, category=${config.categoryEnabled}, risk=${config.riskEnabled}`,
  );

  let complexityMetrics: ComplexityMetrics | undefined;
  if (labelerConfig.complexity.enabled) {
    logInfoI18n('analysis.complexityAnalyzing');
    const complexityAnalyzer = createComplexityAnalyzer();
    const complexityFiles = analysis.metrics.filesAnalyzed
      .map(f => f.path)
      .filter(filePath => {
        const ext = path.extname(filePath);
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

  const artifacts: AnalysisArtifacts = {
    files,
    analysis,
    hasViolations,
    ...(complexityMetrics ? { complexityMetrics } : {}),
  };

  return artifacts;
}

/**
 * Apply PR labels including directory-based labeling
 */
export async function applyLabelsStage(context: InitializationArtifacts, artifacts: AnalysisArtifacts): Promise<void> {
  const { token, prContext, config, labelerConfig } = context;
  const { analysis, files, complexityMetrics } = artifacts;

  logInfoI18n('labels.decidingLabels');
  const prMetrics: PRMetrics = {
    totalAdditions: analysis.metrics.totalAdditions,
    files: analysis.metrics.filesAnalyzed,
    ...(complexityMetrics && { complexity: complexityMetrics }),
  };

  const octokit = github.getOctokit(token);
  const extendedPRContext: PRContext = {
    owner: prContext.owner,
    repo: prContext.repo,
    pullNumber: prContext.pullNumber,
  };

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

  if (config.enableDirectoryLabeling) {
    logInfoI18n('directoryLabeling.starting');

    const dirConfigResult = loadDirectoryLabelerConfig(config.directoryLabelerConfigPath);

    if (dirConfigResult.isErr()) {
      if (dirConfigResult.error.type === 'FileSystemError') {
        logInfoI18n('directoryLabeling.configNotFound', { path: config.directoryLabelerConfigPath });
        logInfoI18n('directoryLabeling.skipped');
      } else {
        logWarningI18n('directoryLabeling.configLoadFailed', { message: dirConfigResult.error.message });
        logInfoI18n('directoryLabeling.skipped');
      }
    } else {
      const dirConfig = dirConfigResult.value;
      dirConfig.useDefaultExcludes = config.useDefaultExcludes;

      const fileList = files.map(file => file.filename);
      const directoryDecisionsResult = decideLabelsForFiles(fileList, dirConfig);

      if (directoryDecisionsResult.isErr()) {
        logWarningI18n('directoryLabeling.decideFailed', { message: directoryDecisionsResult.error.message });
      } else {
        const directoryDecisions = directoryDecisionsResult.value;

        if (directoryDecisions.length === 0) {
          logInfoI18n('directoryLabeling.noLabelsMatched');
        } else {
          logInfoI18n('directoryLabeling.decided', { count: directoryDecisions.length });

          const { selected, rejected } = filterByMaxLabels(directoryDecisions, config.maxLabels);

          if (rejected.length > 0) {
            logWarningI18n('directoryLabeling.rejected', { count: rejected.length });
            for (const rejectedDecision of rejected) {
              logDebugI18n('directoryLabeling.rejectedDetail', {
                label: rejectedDecision.label,
                reason: rejectedDecision.reason,
              });
            }
          }

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
              for (const failed of result.failed) {
                logWarningI18n('directoryLabeling.failedDetail', { label: failed.label, reason: failed.reason });
              }
            }
          }
        }
      }
    }
  }
}

/**
 * Finalize action by posting comments, summaries, and outputs
 */
export async function finalizeAction(context: InitializationArtifacts, artifacts: AnalysisArtifacts): Promise<void> {
  const { token, prContext, config, labelerConfig } = context;
  const { analysis, hasViolations, complexityMetrics } = artifacts;

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

  if (config.enableSummary) {
    logInfoI18n('summary.writing');

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

    const summaryResult: Result<SummaryWriteResult, Error> = await writeSummaryWithAnalysis(
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
    } else if (summaryResult.value.action === 'written') {
      logInfoI18n('summary.written', { bytes: summaryResult.value.bytesWritten });
    }
  }

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

  const appliedLabels = await getCurrentPRLabels(token, {
    owner: prContext.owner,
    repo: prContext.repo,
    pullNumber: prContext.pullNumber,
  });

  const failures = evaluatePRFailures({
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
}
