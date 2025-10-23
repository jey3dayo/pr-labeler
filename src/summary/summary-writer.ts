/**
 * GitHub Actions Summary writer
 * Responsible for generating and publishing markdown reports
 */

import * as core from '@actions/core';
import { err, ok, Result } from 'neverthrow';

import { logDebug, logInfo, logWarning } from '../actions-io';
import { ensureError } from '../errors/index.js';
import type { ComplexityConfig, ComplexityMetrics } from '../labeler-types';
import {
  formatBasicMetrics,
  formatBestPractices,
  formatFileDetails,
  formatImprovementActions,
  formatViolations,
  generateComplexitySummary,
  type SummaryContext,
} from '../report-formatter';
import type { AnalysisResult } from '../types/analysis.js';

/**
 * Write raw markdown content to GitHub Actions summary
 */
export async function writeSummary(content: string): Promise<void> {
  await core.summary.addRaw(content).write();
}

/**
 * Summary write result
 */
export interface SummaryWriteResult {
  action: 'written' | 'skipped';
  bytesWritten?: number;
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
 * @returns Result<SummaryWriteResult, Error>
 */
export async function writeSummaryWithAnalysis(
  analysis: AnalysisResult,
  config: { enableSummary: boolean },
  complexity?: { metrics: ComplexityMetrics; config: ComplexityConfig; context: SummaryContext },
  options?: { disabledFeatures?: string[] },
): Promise<Result<SummaryWriteResult, Error>> {
  if (!config.enableSummary) {
    logDebug('Summary output skipped (enable_summary=false)');
    return ok({ action: 'skipped' });
  }

  try {
    logDebug('Generating GitHub Actions Summary...');

    let markdown = '';
    markdown += '# 📊 PR Labeler\n\n';
    markdown += formatBasicMetrics(analysis.metrics);
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

    await writeSummary(markdown);

    const bytesWritten = Buffer.byteLength(markdown, 'utf8');
    logInfo(`✅ Summary written successfully (${bytesWritten} bytes)`);

    return ok({ action: 'written', bytesWritten });
  } catch (error) {
    const e = ensureError(error);
    logWarning(`Failed to write summary: ${e.message}`);
    return err(new Error(`Failed to write GitHub Actions Summary: ${e.message}`));
  }
}
