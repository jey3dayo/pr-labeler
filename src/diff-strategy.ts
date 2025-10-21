/**
 * Diff strategy - retrieves PR diff files using local git or GitHub API
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

import * as github from '@actions/github';
import { err, ok, Result } from 'neverthrow';

import { getEnvVar, logDebug, logInfo, logWarning } from './actions-io';
import type { DiffError } from './errors/index.js';
import { createDiffError, extractErrorMessage } from './errors/index.js';

// Create execAsync using promisify
const execAsync = promisify(exec);

/**
 * Diff file information
 */
export interface DiffFile {
  filename: string;
  additions: number;
  deletions: number;
  status: 'added' | 'modified' | 'renamed' | 'copied';
}

/**
 * Diff result with strategy used
 */
export interface DiffResult {
  files: DiffFile[];
  strategy: 'local-git' | 'github-api';
}

/**
 * Pull request context
 */
export interface PullRequestContext {
  owner: string;
  repo: string;
  pullNumber: number;
  baseSha: string;
  headSha: string;
}

/**
 * Parse git diff numstat output line
 */
function parseGitDiffLine(line: string): DiffFile | null {
  const parts = line.trim().split('\t');
  if (parts.length !== 3) {
    return null;
  }

  const additions = parseInt(parts[0] ?? '', 10);
  const deletions = parseInt(parts[1] ?? '', 10);
  const filename = parts[2] ?? '';

  // Skip if parsing failed
  if (isNaN(additions) || isNaN(deletions) || !filename) {
    return null;
  }

  // Determine status based on additions and deletions
  let status: DiffFile['status'];
  if (deletions === 0 && additions > 0) {
    status = 'added';
  } else if (additions === 0 && deletions === 0) {
    status = 'renamed';
  } else {
    status = 'modified';
  }

  return {
    filename,
    additions,
    deletions,
    status,
  };
}

/**
 * Get diff files using local git command
 */
async function getLocalGitDiff(context: PullRequestContext): Promise<Result<DiffFile[], DiffError>> {
  try {
    logDebug('Attempting to get diff using local git command');

    // Use git diff with numstat to get file changes
    // --diff-filter=ACMR filters: Added, Copied, Modified, Renamed (excludes Deleted)
    // -M/-C enables rename and copy detection for better accuracy
    const command = `git diff --numstat -M -C --diff-filter=ACMR ${context.baseSha}...${context.headSha}`;

    const { stdout, stderr } = await execAsync(command, {
      cwd: getEnvVar('GITHUB_WORKSPACE') || process.cwd(),
      maxBuffer: 16 * 1024 * 1024, // 16MB buffer for large diffs
    });

    if (stderr) {
      logWarning(`Git command stderr: ${stderr}`);
    }

    // Parse the output
    const lines = stdout
      .trim()
      .split('\n')
      .filter(line => line.length > 0);
    const files: DiffFile[] = [];

    for (const line of lines) {
      const file = parseGitDiffLine(line);
      if (file) {
        // Filter out removed files (shouldn't happen with --diff-filter, but double-check)
        if (file.additions === 0 && file.deletions > 0) {
          continue;
        }
        files.push(file);
      }
    }

    logInfo(`Successfully retrieved ${files.length} files using local git`);
    return ok(files);
  } catch (error) {
    const message = extractErrorMessage(error);
    logWarning(`Local git diff failed: ${message}`);
    return err(createDiffError('local-git', `Failed to get local git diff: ${message}`));
  }
}

/**
 * Get diff files using GitHub API
 */
async function getGitHubAPIDiff(context: PullRequestContext, token: string): Promise<Result<DiffFile[], DiffError>> {
  try {
    logDebug('Attempting to get diff using GitHub API');

    const octokit = github.getOctokit(token);
    const files: DiffFile[] = [];
    let page = 1;
    const perPage = 100;

    // Paginate through all files - continue until we get an empty response
    while (true) {
      const response = await octokit.rest.pulls.listFiles({
        owner: context.owner,
        repo: context.repo,
        pull_number: context.pullNumber,
        per_page: perPage,
        page,
      });

      // Stop when there are no more files
      if (response.data.length === 0) {
        break;
      }

      for (const file of response.data) {
        // Filter out removed files
        if (file.status === 'removed') {
          continue;
        }

        // Map GitHub API status to our status
        let status: DiffFile['status'];
        switch (file.status) {
          case 'added':
            status = 'added';
            break;
          case 'renamed':
            status = 'renamed';
            break;
          case 'copied':
            status = 'copied';
            break;
          case 'modified':
          case 'changed':
          default:
            status = 'modified';
            break;
        }

        files.push({
          filename: file.filename,
          additions: file.additions,
          deletions: file.deletions,
          status,
        });
      }

      // Continue to next page
      page++;

      // Safety check to prevent infinite loops
      if (page > 100) {
        logWarning('Pagination safety limit reached (100 pages)');
        break;
      }
    }

    logInfo(`Successfully retrieved ${files.length} files using GitHub API`);
    return ok(files);
  } catch (error) {
    const message = extractErrorMessage(error);
    logWarning(`GitHub API diff failed: ${message}`);
    return err(createDiffError('github-api', `Failed to get GitHub API diff: ${message}`));
  }
}

/**
 * Get diff files for a pull request
 * Tries local git first, then falls back to GitHub API
 */
export async function getDiffFiles(context: PullRequestContext, token: string): Promise<Result<DiffResult, DiffError>> {
  // Try local git first (faster and doesn't count against API limits)
  const localResult = await getLocalGitDiff(context);
  if (localResult.isOk()) {
    return ok({
      files: localResult.value,
      strategy: 'local-git',
    });
  }

  // Fallback to GitHub API
  logInfo('Falling back to GitHub API for diff retrieval');
  const apiResult = await getGitHubAPIDiff(context, token);
  if (apiResult.isOk()) {
    return ok({
      files: apiResult.value,
      strategy: 'github-api',
    });
  }

  // Both strategies failed
  return err(
    createDiffError(
      'both',
      `Failed to get diff files. Local git error: ${localResult.error.message}. API error: ${apiResult.error.message}`,
    ),
  );
}
