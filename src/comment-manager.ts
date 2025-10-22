/**
 * Comment management for GitHub pull requests
 * Handles posting and updating PR comments with analysis results
 */

import * as github from '@actions/github';
import { err, ok, Result } from 'neverthrow';

import { logDebug, logInfo } from './actions-io';
import type { GitHubAPIError } from './errors/index.js';
import { createGitHubAPIError, extractErrorMessage } from './errors/index.js';
import type { AnalysisResult } from './file-metrics';
import { t } from './i18n';
import {
  formatBasicMetrics,
  formatBestPractices,
  formatFileAnalysis,
  formatImprovementActions,
  formatViolations,
} from './report-formatter';
import type { PRContext } from './types';

/**
 * Comment configuration
 */
export interface CommentConfig {
  commentMode: 'always' | 'auto' | 'never';
}

/**
 * Comment action result
 */
export interface CommentResult {
  action: 'created' | 'updated' | 'deleted' | 'skipped';
  commentId: number | null;
}

// Comment signature for identification
export const COMMENT_SIGNATURE = '<!-- pr-labeler -->';

/**
 * Check if analysis result has any violations
 */
function hasViolations(analysisResult: AnalysisResult): boolean {
  return (
    analysisResult.violations.largeFiles.length > 0 ||
    analysisResult.violations.exceedsFileLines.length > 0 ||
    analysisResult.violations.exceedsAdditions ||
    analysisResult.violations.exceedsFileCount
  );
}

/**
 * Generate comment body from analysis results
 */
export function generateCommentBody(analysisResult: AnalysisResult): string {
  const { metrics, violations } = analysisResult;
  const hasViolationsFlag = hasViolations(analysisResult);

  let body = '';

  // Header (translated)
  if (hasViolationsFlag) {
    body += `## 📊 ${t('common', 'comment.headerViolation')}\n\n`;
  } else {
    body += `## ✅ ${t('common', 'comment.headerPassed')}\n\n`;
  }

  // Basic metrics section (using shared formatter, without timestamp for comments)
  const metricsSection = formatBasicMetrics(metrics, { includeTimestamp: false });
  body += metricsSection;

  // Violations section (using shared formatter - summary only)
  body += formatViolations(violations);
  body += formatImprovementActions(violations);
  body += formatBestPractices();

  // Unified file analysis table (combines violations and file details)
  if (metrics.filesAnalyzed.length > 0) {
    body += formatFileAnalysis(violations, metrics.filesAnalyzed, 10);
  }

  // Files with errors note (translated)
  if (metrics.filesWithErrors.length > 0) {
    body += `### ⚠️ ${t('common', 'comment.analysisErrors')}\n\n`;
    body += `${t('common', 'comment.filesNotAnalyzed')}\n\n`;
    for (const file of metrics.filesWithErrors.slice(0, 10)) {
      body += `- ${file}\n`;
    }
    if (metrics.filesWithErrors.length > 10) {
      body += `- ${t('common', 'comment.andMore', { count: metrics.filesWithErrors.length - 10 })}\n`;
    }
    body += '\n';
  }

  // Footer with signature (translated)
  body += '---\n';
  body += `*${t('common', 'comment.footer')}*\n`;
  body += COMMENT_SIGNATURE;

  return body;
}

/**
 * Find existing comment with our signature
 */
export async function findExistingComment(
  token: string,
  context: PRContext,
): Promise<Result<number | null, GitHubAPIError>> {
  try {
    logDebug(`Searching for existing comment on PR #${context.pullNumber}`);

    const octokit = github.getOctokit(token);

    // Use Octokit's paginate.iterator for efficient pagination
    for await (const { data } of octokit.paginate.iterator(octokit.rest.issues.listComments, {
      owner: context.owner,
      repo: context.repo,
      issue_number: context.pullNumber,
      per_page: 100,
    })) {
      // Search for comment with our signature
      for (const comment of data) {
        if (comment.body?.includes(COMMENT_SIGNATURE)) {
          logDebug(`Found existing comment with ID ${comment.id}`);
          return ok(comment.id);
        }
      }
    }

    logDebug('No existing comment found');
    return ok(null);
  } catch (error) {
    const message = extractErrorMessage(error);
    return err(createGitHubAPIError(`Failed to find existing comment: ${message}`));
  }
}

/**
 * Post a new comment
 */
export async function postComment(
  body: string,
  token: string,
  context: PRContext,
): Promise<Result<number, GitHubAPIError>> {
  try {
    logInfo('Posting new comment on PR');

    const octokit = github.getOctokit(token);
    const response = await octokit.rest.issues.createComment({
      owner: context.owner,
      repo: context.repo,
      issue_number: context.pullNumber,
      body,
    });

    logInfo(`Comment posted successfully (ID: ${response.data.id})`);
    return ok(response.data.id);
  } catch (error) {
    const message = extractErrorMessage(error);
    return err(createGitHubAPIError(`Failed to post comment: ${message}`));
  }
}

/**
 * Update an existing comment
 */
export async function updateComment(
  commentId: number,
  body: string,
  token: string,
  context: PRContext,
): Promise<Result<void, GitHubAPIError>> {
  try {
    logInfo(`Updating comment ${commentId}`);

    const octokit = github.getOctokit(token);
    await octokit.rest.issues.updateComment({
      owner: context.owner,
      repo: context.repo,
      comment_id: commentId,
      body,
    });

    logInfo('Comment updated successfully');
    return ok(undefined);
  } catch (error) {
    const message = extractErrorMessage(error);
    return err(createGitHubAPIError(`Failed to update comment: ${message}`));
  }
}

/**
 * Delete a comment
 */
export async function deleteComment(
  commentId: number,
  token: string,
  context: PRContext,
): Promise<Result<void, GitHubAPIError>> {
  try {
    logInfo(`Deleting comment ${commentId}`);

    const octokit = github.getOctokit(token);
    await octokit.rest.issues.deleteComment({
      owner: context.owner,
      repo: context.repo,
      comment_id: commentId,
    });

    logInfo('Comment deleted successfully');
    return ok(undefined);
  } catch (error) {
    const message = extractErrorMessage(error);
    return err(createGitHubAPIError(`Failed to delete comment: ${message}`));
  }
}

/**
 * Manage PR comment based on configuration
 */
export async function manageComment(
  analysisResult: AnalysisResult,
  config: CommentConfig,
  token: string,
  context: PRContext,
): Promise<Result<CommentResult, GitHubAPIError>> {
  const hasViolationsFlag = hasViolations(analysisResult);

  // Check for existing comment
  const existingCommentResult = await findExistingComment(token, context);
  if (existingCommentResult.isErr()) {
    return err(existingCommentResult.error);
  }
  const existingCommentId = existingCommentResult.value;

  // Handle 'never' mode
  if (config.commentMode === 'never') {
    if (existingCommentId) {
      const deleteResult = await deleteComment(existingCommentId, token, context);
      if (deleteResult.isErr()) {
        return err(deleteResult.error);
      }
      return ok({ action: 'deleted', commentId: existingCommentId });
    }
    return ok({ action: 'skipped', commentId: null });
  }

  // Handle 'auto' mode
  if (config.commentMode === 'auto') {
    if (!hasViolationsFlag) {
      // Delete comment if no violations
      if (existingCommentId) {
        const deleteResult = await deleteComment(existingCommentId, token, context);
        if (deleteResult.isErr()) {
          return err(deleteResult.error);
        }
        return ok({ action: 'deleted', commentId: existingCommentId });
      }
      return ok({ action: 'skipped', commentId: null });
    }
  }

  // Generate comment body
  const commentBody = generateCommentBody(analysisResult);

  // Update or create comment
  if (existingCommentId) {
    const updateResult = await updateComment(existingCommentId, commentBody, token, context);
    if (updateResult.isErr()) {
      return err(updateResult.error);
    }
    return ok({ action: 'updated', commentId: existingCommentId });
  } else {
    const postResult = await postComment(commentBody, token, context);
    if (postResult.isErr()) {
      return err(postResult.error);
    }
    return ok({ action: 'created', commentId: postResult.value });
  }
}
