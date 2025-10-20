/**
 * GitHub Actions I/O interface
 * Handles input/output operations and logging for the action
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { err, ok, Result } from 'neverthrow';

import type { ConfigurationError } from './errors';
import { createConfigurationError } from './errors';
import type { AnalysisResult } from './file-metrics';
import type { ComplexityConfig, ComplexityMetrics } from './labeler-types';
import {
  formatBasicMetrics,
  formatFileDetails,
  formatViolations,
  generateComplexitySummary,
  type SummaryContext,
} from './report-formatter';

/**
 * Action input parameters (snake_case from action.yml)
 */
export interface ActionInputs {
  github_token: string;
  file_size_limit: string;
  file_lines_limit: string;
  pr_additions_limit: string;
  pr_files_limit: string;
  apply_labels: string;
  auto_remove_labels: string;
  apply_size_labels: string;
  size_label_thresholds: string;
  large_files_label: string;
  too_many_files_label: string;
  skip_draft_pr: string;
  comment_on_pr: string;
  fail_on_violation: string;
  enable_summary: string;
  additional_exclude_patterns: string;
  // Directory-Based Labeling
  enable_directory_labeling: string;
  directory_labeler_config_path: string;
  auto_create_labels: string;
  label_color: string;
  label_description: string;
  max_labels: string;
  use_default_excludes: string;
}

/**
 * Action output parameters
 */
export interface ActionOutputs {
  large_files: string; // JSON array of files exceeding limits
  pr_additions: string; // Total lines added in PR
  pr_files: string; // Total number of files in PR
  exceeds_file_size: string; // "true" | "false"
  exceeds_file_lines: string; // "true" | "false"
  exceeds_additions: string; // "true" | "false"
  exceeds_file_count: string; // "true" | "false"
  has_violations: string; // "true" | "false"
}

/**
 * Get environment variable (abstraction for testability)
 */
export function getEnvVar(key: string): string | undefined {
  return process.env[key];
}

/**
 * Resolve token value from input or environment variables
 * Priority: input parameter > GITHUB_TOKEN > GH_TOKEN
 * @internal
 */
function resolveTokenValue(): string | undefined {
  return core.getInput('github_token') || getEnvVar('GITHUB_TOKEN') || getEnvVar('GH_TOKEN');
}

/**
 * Get GitHub token from input or environment variables
 * Priority: input parameter > GITHUB_TOKEN > GH_TOKEN
 */
export function getGitHubToken(): Result<string, ConfigurationError> {
  const token = resolveTokenValue();

  if (!token) {
    return err(
      createConfigurationError(
        'github_token',
        undefined,
        'GitHub token is required. Set github_token input or GITHUB_TOKEN/GH_TOKEN environment variable',
      ),
    );
  }

  // Mark token as secret to prevent it from being logged
  core.setSecret(token);
  return ok(token);
}

/**
 * Get all action inputs with defaults
 */
export function getActionInputs(): ActionInputs {
  return {
    github_token: resolveTokenValue() || '',
    file_size_limit: core.getInput('file_size_limit') || '100KB',
    file_lines_limit: core.getInput('file_lines_limit') || '500',
    pr_additions_limit: core.getInput('pr_additions_limit') || '5000',
    pr_files_limit: core.getInput('pr_files_limit') || '50',
    apply_labels: core.getInput('apply_labels') || 'true',
    auto_remove_labels: core.getInput('auto_remove_labels') || 'true',
    apply_size_labels: core.getInput('apply_size_labels') || 'true',
    size_label_thresholds:
      core.getInput('size_label_thresholds') ||
      '{"S": {"additions": 100, "files": 10}, "M": {"additions": 500, "files": 30}, "L": {"additions": 1000, "files": 50}}',
    large_files_label: core.getInput('large_files_label') || 'auto:large-files',
    too_many_files_label: core.getInput('too_many_files_label') || 'auto:too-many-files',
    skip_draft_pr: core.getInput('skip_draft_pr') || 'true',
    comment_on_pr: core.getInput('comment_on_pr') || 'auto',
    fail_on_violation: core.getInput('fail_on_violation') || 'false',
    enable_summary: core.getInput('enable_summary') || 'true',
    additional_exclude_patterns: core.getInput('additional_exclude_patterns') || '',
    // Directory-Based Labeling
    enable_directory_labeling: core.getInput('enable_directory_labeling') || 'false',
    directory_labeler_config_path: core.getInput('directory_labeler_config_path') || '.github/directory-labeler.yml',
    auto_create_labels: core.getInput('auto_create_labels') || 'false',
    label_color: core.getInput('label_color') || 'cccccc',
    label_description: core.getInput('label_description') || '',
    max_labels: core.getInput('max_labels') || '10',
    use_default_excludes: core.getInput('use_default_excludes') || 'true',
  };
}

/**
 * Set action output values
 */
export function setActionOutputs(outputs: ActionOutputs): void {
  core.setOutput('large_files', outputs.large_files);
  core.setOutput('pr_additions', outputs.pr_additions);
  core.setOutput('pr_files', outputs.pr_files);
  core.setOutput('exceeds_file_size', outputs.exceeds_file_size);
  core.setOutput('exceeds_file_lines', outputs.exceeds_file_lines);
  core.setOutput('exceeds_additions', outputs.exceeds_additions);
  core.setOutput('exceeds_file_count', outputs.exceeds_file_count);
  core.setOutput('has_violations', outputs.has_violations);
}

/**
 * Log info message
 */
export function logInfo(message: string): void {
  core.info(message);
}

/**
 * Log debug message
 */
export function logDebug(message: string): void {
  core.debug(message);
}

/**
 * Log warning message
 */
export function logWarning(message: string): void {
  core.warning(message);
}

/**
 * Log error message
 */
export function logError(message: string): void {
  core.error(message);
}

/**
 * Set action as failed
 */
export function setFailed(message: string): void {
  core.setFailed(message);
}

/**
 * Write to GitHub Actions Summary
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
 * @returns Result<SummaryWriteResult, Error>
 */
export async function writeSummaryWithAnalysis(
  analysis: AnalysisResult,
  config: { enableSummary: boolean },
  complexity?: { metrics: ComplexityMetrics; config: ComplexityConfig; context: SummaryContext },
): Promise<Result<SummaryWriteResult, Error>> {
  // Skip if disabled
  if (!config.enableSummary) {
    logDebug('Summary output skipped (enable_summary=false)');
    return ok({ action: 'skipped' });
  }

  try {
    logDebug('Generating GitHub Actions Summary...');

    // Generate markdown content using report formatters
    let markdown = '';
    markdown += '# 📊 PR Metrics\n\n';
    markdown += formatBasicMetrics(analysis.metrics);
    markdown += formatViolations(analysis.violations);

    // Add file details (limit to 100 files for large PRs)
    if (analysis.metrics.filesAnalyzed.length > 0) {
      markdown += formatFileDetails(analysis.metrics.filesAnalyzed, 100);
    }

    // Files with errors
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

    // Complexity section (if provided)
    if (complexity) {
      markdown += generateComplexitySummary(complexity.metrics, complexity.config, complexity.context);
    }

    // Write summary
    await writeSummary(markdown);

    const bytesWritten = Buffer.byteLength(markdown, 'utf8');
    logInfo(`✅ Summary written successfully (${bytesWritten} bytes)`);

    return ok({ action: 'written', bytesWritten });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logWarning(`Failed to write summary: ${message}`);
    return err(new Error(`Failed to write GitHub Actions Summary: ${message}`));
  }
}

/**
 * Get pull request context from GitHub Actions
 * Uses @actions/github context for reliable PR information
 */
export function getPullRequestContext(): {
  owner: string;
  repo: string;
  pullNumber: number;
  baseSha: string;
  headSha: string;
  isDraft: boolean;
} {
  const context = github.context;
  const pullRequest = context.payload.pull_request;

  if (!pullRequest) {
    throw new Error(
      'This action must be run in the context of a pull request. ' +
        'Ensure the workflow is triggered by pull_request or pull_request_target events.',
    );
  }

  return {
    owner: context.repo.owner,
    repo: context.repo.repo,
    pullNumber: pullRequest.number,
    baseSha: pullRequest['base'].sha,
    headSha: pullRequest['head'].sha,
    isDraft: pullRequest['draft'] === true,
  };
}
