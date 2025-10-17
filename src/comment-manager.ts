/**
 * Comment management for GitHub pull requests
 * Handles posting and updating PR comments with analysis results
 */

import { Result, ok, err } from 'neverthrow';
import * as github from '@actions/github';
import { createGitHubAPIError } from './errors';
import { logInfo, logWarning, logDebug } from './actions-io';
import type { GitHubAPIError } from './errors';
import type { AnalysisResult } from './file-metrics';

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

/**
 * PR context for comment operations
 */
interface PRContext {
  owner: string;
  repo: string;
  pullNumber: number;
}

// Comment signature for identification
export const COMMENT_SIGNATURE = '<!-- pr-metrics-action -->';

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return '0 B';
  }

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Format number with thousands separator
 */
function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Generate comment body from analysis results
 */
export function generateCommentBody(analysisResult: AnalysisResult): string {
  const { metrics, violations } = analysisResult;
  const hasViolations =
    violations.largeFiles.length > 0 ||
    violations.exceedsFileLines.length > 0 ||
    violations.exceedsAdditions ||
    violations.exceedsFileCount;

  let body = '';

  // Header
  if (hasViolations) {
    body += '## ⚠️ PR Size Check - Violations Found\n\n';
  } else {
    body += '## ✅ PR Size Check Passed\n\n';
  }

  // Summary
  body += '### 📊 Summary\n\n';

  if (metrics.totalFiles === 0) {
    body += '**No files to analyze**\n\n';
  } else {
    body += `- Total additions: **${formatNumber(metrics.totalAdditions)}**\n`;
    body += `- Files analyzed: **${metrics.filesAnalyzed.length}**\n`;
    body += `- Files excluded: **${metrics.filesExcluded.length}**\n`;
    body += `- Binary files skipped: **${metrics.filesSkippedBinary.length}**\n`;

    if (metrics.filesWithErrors.length > 0) {
      body += `- Files with errors: **${metrics.filesWithErrors.length}** ⚠️\n`;
    }

    if (hasViolations) {
      body += '\n### 📊 Violations Summary\n\n';

      if (violations.largeFiles.length > 0) {
        body += `- **${violations.largeFiles.length}** file(s) exceed size limit\n`;
      }
      if (violations.exceedsFileLines.length > 0) {
        body += `- **${violations.exceedsFileLines.length}** file(s) exceed line limit\n`;
      }
      if (violations.exceedsAdditions) {
        body += '- **Total additions exceed limit**\n';
      }
      if (violations.exceedsFileCount) {
        body += '- **File count exceeds limit**\n';
      }
    } else {
      body += '\n**All files are within size limits** ✅\n';
    }
    body += '\n';
  }

  // Violation details
  if (violations.largeFiles.length > 0) {
    body += '### 🚫 Large Files Detected\n\n';
    body += '| File | Size | Limit | Status |\n';
    body += '|------|------|-------|--------|\n';

    for (const violation of violations.largeFiles) {
      const status = violation.severity === 'critical' ? '🚫 Critical' : '⚠️ Warning';
      body += `| ${violation.file} | ${formatBytes(violation.actualValue)} | ${formatBytes(violation.limit)} | ${status} |\n`;
    }
    body += '\n';
  }

  if (violations.exceedsFileLines.length > 0) {
    body += '### ⚠️ Files Exceed Line Limit\n\n';
    body += '| File | Lines | Limit | Status |\n';
    body += '|------|-------|-------|--------|\n';

    for (const violation of violations.exceedsFileLines) {
      const status = violation.severity === 'critical' ? '🚫 Critical' : '⚠️ Warning';
      body += `| ${violation.file} | ${formatNumber(violation.actualValue)} | ${formatNumber(violation.limit)} | ${status} |\n`;
    }
    body += '\n';
  }

  // Top large files (if any files were analyzed)
  if (metrics.filesAnalyzed.length > 0) {
    body += '### 📈 Top Large Files\n\n';
    body += '| File | Size | Lines | Changes |\n';
    body += '|------|------|-------|----------|\n';

    // Sort by size and take top 10
    const topFiles = [...metrics.filesAnalyzed].sort((a, b) => b.size - a.size).slice(0, 10);

    for (const file of topFiles) {
      const changes = `+${file.additions}/-${file.deletions}`;
      body += `| ${file.filename} | ${formatBytes(file.size)} | ${formatNumber(file.lines)} | ${changes} |\n`;
    }
    body += '\n';
  }

  // Files with errors note
  if (metrics.filesWithErrors.length > 0) {
    body += '### ⚠️ Analysis Errors\n\n';
    body += 'Some files could not be analyzed:\n\n';
    for (const file of metrics.filesWithErrors.slice(0, 10)) {
      body += `- ${file}\n`;
    }
    if (metrics.filesWithErrors.length > 10) {
      body += `- ...and ${metrics.filesWithErrors.length - 10} more\n`;
    }
    body += '\n';
  }

  // Footer with signature
  body += '---\n';
  body += `*Generated by [PR Metrics Action](https://github.com/marketplace/actions/pr-metrics)*\n`;
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
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await octokit.rest.issues.listComments({
        owner: context.owner,
        repo: context.repo,
        issue_number: context.pullNumber,
        per_page: perPage,
        page,
      });

      // Search for comment with our signature
      for (const comment of response.data) {
        if (comment.body?.includes(COMMENT_SIGNATURE)) {
          logDebug(`Found existing comment with ID ${comment.id}`);
          return ok(comment.id);
        }
      }

      // Stop if no more pages
      if (response.data.length < perPage) {
        break;
      }

      page++;
      // Safety limit
      if (page > 10) {
        logWarning('Reached pagination limit while searching for comment');
        break;
      }
    }

    logDebug('No existing comment found');
    return ok(null);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
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
    const message = error instanceof Error ? error.message : 'Unknown error';
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
    const message = error instanceof Error ? error.message : 'Unknown error';
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
    const message = error instanceof Error ? error.message : 'Unknown error';
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
  const hasViolations =
    analysisResult.violations.largeFiles.length > 0 ||
    analysisResult.violations.exceedsFileLines.length > 0 ||
    analysisResult.violations.exceedsAdditions ||
    analysisResult.violations.exceedsFileCount;

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
    if (!hasViolations) {
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
