/**
 * File metrics analysis
 * Measures file sizes, line counts, and aggregates metrics
 */

import { execFile } from 'node:child_process';
import { createReadStream, promises as fs } from 'node:fs';
import * as path from 'node:path';
import { createInterface } from 'node:readline';
import { promisify } from 'node:util';

import * as github from '@actions/github';
import { err, ok, Result } from 'neverthrow';

import { logDebug, logInfo, logWarning } from './actions-io';
import type { DiffFile } from './diff-strategy';
import type { FileAnalysisError, ViolationDetail, Violations } from './errors/index.js';
import { createFileAnalysisError, ensureError } from './errors/index.js';
import { getDefaultExcludePatterns, isExcluded } from './pattern-matcher';

// Create execFileAsync using promisify
const execFileAsync = promisify(execFile);

/**
 * File metrics data
 */
export interface FileMetrics {
  path: string;
  size: number;
  lines: number;
  additions: number;
  deletions: number;
}

/**
 * Analysis result with metrics and violations
 */
export interface AnalysisResult {
  metrics: {
    totalFiles: number;
    totalAdditions: number;
    filesAnalyzed: FileMetrics[];
    filesExcluded: string[];
    filesSkippedBinary: string[];
    filesWithErrors: string[];
  };
  violations: Violations;
}

/**
 * Repository context for API calls
 */
interface RepoContext {
  owner: string;
  repo: string;
  headSha?: string; // Optional: HEAD SHA for ref-specific API calls
}

/**
 * Configuration for file analysis
 */
interface AnalysisConfig {
  fileSizeLimit: number;
  fileLineLimit: number;
  maxAddedLines: number;
  maxFileCount: number;
  excludePatterns: string[];
}

// Common binary file extensions
const BINARY_EXTENSIONS = new Set([
  // Images
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.bmp',
  '.ico',
  '.webp',
  '.tiff',
  // Videos
  '.mp4',
  '.avi',
  '.mov',
  '.wmv',
  '.flv',
  '.webm',
  '.mkv',
  '.m4v',
  // Audio
  '.mp3',
  '.wav',
  '.flac',
  '.aac',
  '.ogg',
  '.wma',
  '.m4a',
  // Archives
  '.zip',
  '.tar',
  '.gz',
  '.bz2',
  '.xz',
  '.rar',
  '.7z',
  '.jar',
  // Executables
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.bin',
  '.app',
  '.deb',
  '.rpm',
  // Fonts
  '.ttf',
  '.otf',
  '.woff',
  '.woff2',
  '.eot',
  // Data
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  // Compiled
  '.pyc',
  '.pyo',
  '.class',
  '.o',
  '.a',
  '.lib',
  '.wasm',
  // Database
  '.db',
  '.sqlite',
  '.sqlite3',
  // Other
  '.DS_Store',
]);

/**
 * Get file size using multiple strategies
 * Priority: fs.stat → git ls-tree → GitHub API
 */
export async function getFileSize(
  filePath: string,
  token: string,
  context: RepoContext,
): Promise<Result<number, FileAnalysisError>> {
  logDebug(`Getting size for file: ${filePath}`);

  // Strategy 1: Try fs.stat (fastest)
  try {
    const stats = await fs.stat(filePath);
    if (stats.isFile()) {
      logDebug(`Got size from fs.stat: ${stats.size} bytes`);
      return ok(stats.size);
    }
  } catch (error) {
    logDebug(`fs.stat failed: ${ensureError(error).message}`);
  }

  // Strategy 2: Try git ls-tree
  try {
    const { stdout } = await execFileAsync('git', ['ls-tree', '-l', 'HEAD', filePath]);
    // Parse output: "100644 blob abc123    1234\tfilename"
    // Split by tab first to separate metadata from filename
    const tabParts = stdout.trim().split('\t');
    if (tabParts.length >= 2 && tabParts[0]) {
      // Now split the metadata part by spaces
      const metaParts = tabParts[0].trim().split(/\s+/);
      // Format: [mode, type, hash, size]
      if (metaParts.length >= 4) {
        const size = parseInt(metaParts[3] || '', 10);
        if (!isNaN(size)) {
          logDebug(`Got size from git ls-tree: ${size} bytes`);
          return ok(size);
        }
      }
    }
  } catch (error) {
    logDebug(`git ls-tree failed: ${ensureError(error).message}`);
  }

  // Strategy 3: Try GitHub API
  try {
    const octokit = github.getOctokit(token);
    const response = await octokit.rest.repos.getContent({
      owner: context.owner,
      repo: context.repo,
      path: filePath,
      ...(context.headSha && { ref: context.headSha }), // Use ref if headSha is provided
    });

    if ('size' in response.data && response.data.type === 'file') {
      logDebug(`Got size from GitHub API: ${response.data.size} bytes`);
      return ok(response.data.size);
    }
  } catch (error) {
    logDebug(`GitHub API failed: ${ensureError(error).message}`);
  }

  return err(createFileAnalysisError(filePath, 'Failed to get file size using all strategies'));
}

/**
 * Count lines in a file
 * Priority: wc -l → Node.js implementation
 */
export async function getFileLineCount(
  filePath: string,
  maxLines?: number,
): Promise<Result<number, FileAnalysisError>> {
  logDebug(`Counting lines in file: ${filePath}`);

  // Strategy 1: Try wc -l (fastest for large files)
  try {
    const { stdout } = await execFileAsync('wc', ['-l', filePath]);
    const match = stdout.match(/^\s*(\d+)/);
    if (match && match[1]) {
      const lines = parseInt(match[1], 10);
      logDebug(`Got line count from wc -l: ${lines}`);
      if (maxLines && lines > maxLines) {
        return ok(maxLines);
      }
      return ok(lines);
    }
  } catch (error) {
    logDebug(`wc -l failed: ${ensureError(error).message}`);
  }

  // Strategy 2: Node.js streaming implementation (memory-efficient)
  try {
    const fileStream = createReadStream(filePath, { encoding: 'utf-8' });
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity, // Treat \r\n as single line break
    });

    let lineCount = 0;

    for await (const _line of rl) {
      lineCount++;

      // Early termination if maxLines is set
      if (maxLines && lineCount >= maxLines) {
        rl.close();
        fileStream.destroy();
        logDebug(`Line count reached max (${maxLines}), early termination`);
        return ok(maxLines);
      }
    }

    logDebug(`Got line count from Node.js streaming: ${lineCount}`);
    return ok(lineCount);
  } catch (error) {
    const message = ensureError(error).message;
    return err(createFileAnalysisError(filePath, `Failed to count lines: ${message}`));
  }
}

/**
 * Check if a file is binary based on extension or content
 */
export async function isBinaryFile(filePath: string): Promise<boolean> {
  const ext = path.extname(filePath).toLowerCase();

  // Check known binary extensions
  if (BINARY_EXTENSIONS.has(ext)) {
    return true;
  }

  // For unknown extensions, try content detection
  try {
    const buffer = await fs.readFile(filePath, { encoding: null });
    const sample = buffer.slice(0, 8192); // Check first 8KB

    // Check for null bytes (common in binary files)
    for (let i = 0; i < sample.length; i++) {
      if (sample[i] === 0) {
        return true;
      }
    }

    // Check if content is mostly non-printable
    let nonPrintable = 0;
    for (let i = 0; i < Math.min(sample.length, 512); i++) {
      const byte = sample[i];
      // Check if byte is outside printable ASCII range (excluding common whitespace)
      if (byte !== undefined && (byte < 32 || byte > 126) && byte !== 9 && byte !== 10 && byte !== 13) {
        nonPrintable++;
      }
    }

    // If more than 30% non-printable, consider binary
    return nonPrintable / Math.min(sample.length, 512) > 0.3;
  } catch (error) {
    // If we can't read the file, assume it's text
    logDebug(`Could not read file for binary detection: ${ensureError(error).message}`);
    return false;
  }
}

/**
 * Analyze files and calculate metrics and violations
 */
export async function analyzeFiles(
  files: DiffFile[],
  config: AnalysisConfig,
  token: string,
  context: RepoContext,
): Promise<Result<AnalysisResult, FileAnalysisError>> {
  logInfo(`Analyzing ${files.length} files`);

  const result: AnalysisResult = {
    metrics: {
      totalFiles: files.length,
      totalAdditions: 0,
      filesAnalyzed: [],
      filesExcluded: [],
      filesSkippedBinary: [],
      filesWithErrors: [],
    },
    violations: {
      largeFiles: [],
      exceedsFileLines: [],
      exceedsAdditions: false,
      exceedsFileCount: false,
    },
  };

  // Check file count violation early
  if (files.length > config.maxFileCount) {
    result.violations.exceedsFileCount = true;
    logWarning(`File count ${files.length} exceeds limit ${config.maxFileCount}`);
  }

  // Combine default and custom exclude patterns
  const excludePatterns = [...getDefaultExcludePatterns(), ...config.excludePatterns];

  // Calculate total additions from ALL files (including excluded)
  for (const file of files) {
    result.metrics.totalAdditions += file.additions;
  }

  // Process each file
  for (let i = 0; i < files.length; i++) {
    // Stop processing after maxFileCount (consistent with violation detection)
    if (i >= config.maxFileCount) {
      logWarning(`Reached max file count limit (${config.maxFileCount}), skipping remaining files`);
      break;
    }

    const file = files[i];
    if (!file) {
      continue;
    }

    // Check if file should be excluded
    if (isExcluded(file.filename, excludePatterns)) {
      result.metrics.filesExcluded.push(file.filename);
      continue;
    }

    // Check if file is binary
    if (await isBinaryFile(file.filename)) {
      result.metrics.filesSkippedBinary.push(file.filename);
      logDebug(`Skipping binary file: ${file.filename}`);
      continue;
    }

    // Get file metrics
    try {
      const sizeResult = await getFileSize(file.filename, token, context);
      const lineResult = await getFileLineCount(file.filename, config.fileLineLimit + 1);

      if (sizeResult.isErr() || lineResult.isErr()) {
        result.metrics.filesWithErrors.push(file.filename);
        logWarning(`Failed to analyze file ${file.filename}`);
        continue;
      }

      const metrics: FileMetrics = {
        path: file.filename,
        size: sizeResult.value,
        lines: lineResult.value,
        additions: file.additions,
        deletions: file.deletions,
      };

      result.metrics.filesAnalyzed.push(metrics);

      // Check for violations
      if (metrics.size > config.fileSizeLimit) {
        const violation: ViolationDetail = {
          file: file.filename,
          actualValue: metrics.size,
          limit: config.fileSizeLimit,
          violationType: 'size',
          severity: 'critical',
        };
        result.violations.largeFiles.push(violation);
        logWarning(`File ${file.filename} exceeds size limit: ${metrics.size} > ${config.fileSizeLimit}`);
      }

      if (metrics.lines > config.fileLineLimit) {
        const violation: ViolationDetail = {
          file: file.filename,
          actualValue: metrics.lines,
          limit: config.fileLineLimit,
          violationType: 'lines',
          severity: 'warning',
        };
        result.violations.exceedsFileLines.push(violation);
        logWarning(`File ${file.filename} exceeds line limit: ${metrics.lines} > ${config.fileLineLimit}`);
      }
    } catch (error) {
      result.metrics.filesWithErrors.push(file.filename);
      logWarning(`Unexpected error analyzing file ${file.filename}: ${ensureError(error).message}`);
    }
  }

  // Check total additions violation
  if (result.metrics.totalAdditions > config.maxAddedLines) {
    result.violations.exceedsAdditions = true;
    logWarning(`Total additions ${result.metrics.totalAdditions} exceeds limit ${config.maxAddedLines}`);
  }

  logInfo(
    `Analysis complete: ${result.metrics.filesAnalyzed.length} files analyzed, ${result.metrics.filesExcluded.length} excluded, ${result.metrics.filesSkippedBinary.length} binary files skipped`,
  );

  return ok(result);
}
