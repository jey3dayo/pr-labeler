import type { Result } from 'neverthrow';

import { logInfoI18n, logWarningI18n, setActionOutputs, setFailed } from '../../actions-io';
import { manageComment } from '../../comment-manager';
import { getCurrentPRLabels } from '../../label-manager.js';
import type { SummaryWriteResult } from '../../summary/summary-writer';
import { writeSummaryWithAnalysis } from '../../summary/summary-writer';
import { evaluatePRFailures } from '../policy/pr-failure-evaluator';
import type { AnalysisArtifacts, InitializationArtifacts } from '../types';

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
      {
        disabledFeatures,
        ...(labelerConfig.summary?.title ? { title: labelerConfig.summary.title } : {}),
      },
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
