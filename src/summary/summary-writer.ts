/**
 * GitHub Actions Summary writer
 * Responsible for generating and publishing markdown reports
 */

import * as core from '@actions/core';
import { errAsync, okAsync, Result, ResultAsync } from 'neverthrow';

import { logDebug, logInfo, logWarning } from '../actions-io';
import { ensureError } from '../errors/index.js';
import { t } from '../i18n.js';
import type { ComplexityConfig, ComplexityMetrics } from '../labeler-types';
import {
  formatBestPractices,
  formatExcludedFiles,
  formatFileDetails,
  formatSummaryBasicMetrics,
  formatAppliedLabels,
  formatImprovementActions,
  formatViolations,
  generateComplexitySummary,
  type SummaryContext,
} from '../report-formatter';
import type { AnalysisResult } from '../types/analysis.js';

/**
 * Write raw markdown content to GitHub Actions summary
 */
export function writeSummary(content: string): ResultAsync<void, Error> {
  return ResultAsync.fromPromise(core.summary.addRaw(content).write(), error => {
    const e = ensureError(error);
    return new Error(`Failed to write GitHub Actions Summary: ${e.message}`);
  }).map(() => undefined);
}

/**
 * Summary write result
 */
export interface SummaryWriteResult {
  action: 'written' | 'skipped';
  bytesWritten?: number;
}

export interface SummaryWriteOptions {
  disabledFeatures?: string[];
  title?: string;
  appliedLabels?: string[] | undefined;
}

/**
 * Build markdown body for GitHub Actions Summary output.
 */
function buildSummaryMarkdown(
  analysis: AnalysisResult,
  complexity?: { metrics: ComplexityMetrics; config: ComplexityConfig; context: SummaryContext },
  options?: SummaryWriteOptions,
): Result<string, Error> {
  return Result.fromThrowable(
    () => {
      const trimmedTitle = options?.title?.trim();
      const summaryTitle = trimmedTitle && trimmedTitle.length > 0 ? trimmedTitle : t('summary', 'overview.title');

      let markdown = '';
      markdown += `# 📊 ${summaryTitle}\n\n`;
      markdown += formatSummaryBasicMetrics(analysis.metrics);

      const excludedFilesSection = formatExcludedFiles(analysis.metrics.filesExcluded);
      if (excludedFilesSection) {
        markdown += excludedFilesSection;
      }

      const appliedLabelsSection = formatAppliedLabels(options?.appliedLabels);
      markdown += appliedLabelsSection;
      markdown += formatViolations(analysis.violations);

      if (analysis.metrics.filesAnalyzed.length > 0) {
        markdown += formatFileDetails(analysis.metrics.filesAnalyzed, 100);
      }

      markdown += formatImprovementActions(analysis.violations);
      markdown += formatBestPractices(analysis.violations, analysis.metrics);

      if (analysis.metrics.filesWithErrors.length > 0) {
        markdown += '### ⚠️ Analysis Errors\n\n';
        markdown += 'Some files could not be analyzed:\n\n';
        for (const file of analysis.metrics.filesWithErrors.slice(0, 10)) {
          markdown += `- ${file}\n`;
        }
        if (analysis.metrics.filesWithErrors.length > 10) {
          markdown += `- ...and ${analysis.metrics.filesWithErrors.length - 10} more\n`;
        }
        markdown += '\n';
      }

      if (complexity) {
        markdown += generateComplexitySummary(complexity.metrics, complexity.config, complexity.context);
      }

      if (options?.disabledFeatures && options.disabledFeatures.length > 0) {
        markdown += '\n---\n\n';
        markdown += `> **ℹ️ Disabled label types:** ${options.disabledFeatures.join(', ')}\n`;
      }

      return markdown;
    },
    error => {
      const e = ensureError(error);
      return new Error(`Failed to generate GitHub Actions Summary content: ${e.message}`);
    },
  )();
}

/**
 * Write PR analysis results to GitHub Actions Summary
 * @param analysis - File analysis result
 * @param config - Summary output configuration
 * @param complexity - Optional complexity data object
 * @param complexity.metrics - Complexity analysis metrics (ComplexityMetrics)
 * @param complexity.config - Complexity configuration settings (ComplexityConfig)
 * @param complexity.context - Summary context for GitHub URLs (SummaryContext)
 * @param options - Optional summary options
 * @param options.disabledFeatures - List of disabled label types (size, complexity, category, risk)
 * @returns ResultAsync<SummaryWriteResult, Error>
 */
export function writeSummaryWithAnalysis(
  analysis: AnalysisResult,
  config: { enableSummary: boolean },
  complexity?: { metrics: ComplexityMetrics; config: ComplexityConfig; context: SummaryContext },
  options?: SummaryWriteOptions,
): ResultAsync<SummaryWriteResult, Error> {
  if (!config.enableSummary) {
    logDebug('Summary output skipped (enable_summary=false)');
    return okAsync<SummaryWriteResult, Error>({ action: 'skipped' });
  }

  logDebug('Generating GitHub Actions Summary...');

  const markdownResult = buildSummaryMarkdown(analysis, complexity, options);
  if (markdownResult.isErr()) {
    const message = markdownResult.error.message;
    logWarning(`Failed to build summary content: ${message}`);
    return errAsync<SummaryWriteResult, Error>(markdownResult.error);
  }

  const markdown = markdownResult.value;

  return writeSummary(markdown)
    .map(() => {
      const bytesWritten = Buffer.byteLength(markdown, 'utf8');
      logInfo(`✅ Summary written successfully (${bytesWritten} bytes)`);

      return { action: 'written' as const, bytesWritten };
    })
    .mapErr(error => {
      logWarning(error.message);
      return error;
    });
}
