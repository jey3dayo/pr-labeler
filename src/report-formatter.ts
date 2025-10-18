/**
 * Report formatting utilities for GitHub Actions Summary and PR comments
 * Provides common markdown generation functions
 */

import type { Violations } from './errors';
import type { AnalysisResult, FileMetrics } from './file-metrics';

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
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
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Options for formatBasicMetrics
 */
export interface FormatBasicMetricsOptions {
  includeHeader?: boolean;
}

/**
 * Format basic metrics section
 * Displays PR additions, files analyzed, excluded files, and timestamp
 */
export function formatBasicMetrics(metrics: AnalysisResult['metrics'], options?: FormatBasicMetricsOptions): string {
  const { includeHeader = true } = options || {};
  let output = '';

  // Header
  if (includeHeader) {
    output += '### 📊 Summary\n\n';
  }

  // Empty check
  if (metrics.totalFiles === 0) {
    output += '**No files to analyze**\n\n';
    return output;
  }

  // Basic metrics
  output += `- Total additions: **${formatNumber(metrics.totalAdditions)}**\n`;
  output += `- Files analyzed: **${metrics.filesAnalyzed.length}**\n`;
  output += `- Files excluded: **${metrics.filesExcluded.length}**\n`;
  output += `- Binary files skipped: **${metrics.filesSkippedBinary.length}**\n`;

  // Files with errors
  if (metrics.filesWithErrors.length > 0) {
    output += `- Files with errors: **${metrics.filesWithErrors.length}** ⚠️\n`;
  }

  // Timestamp
  output += `- Executed at: ${new Date().toISOString()}\n`;
  output += '\n';

  return output;
}

/**
 * Check if violations exist
 */
function hasViolations(violations: Violations): boolean {
  return (
    violations.largeFiles.length > 0 ||
    violations.exceedsFileLines.length > 0 ||
    violations.exceedsAdditions ||
    violations.exceedsFileCount
  );
}

/**
 * Options for formatViolations
 */
export interface FormatViolationsOptions {
  includeHeader?: boolean;
}

/**
 * Format violations section
 * Displays file size violations, line violations, and PR-level violations
 */
export function formatViolations(violations: Violations, options?: FormatViolationsOptions): string {
  const { includeHeader = true } = options || {};
  const hasViolationsFlag = hasViolations(violations);
  let output = '';

  // No violations - success message
  if (!hasViolationsFlag) {
    output += '**All files are within size limits** ✅\n';
    output += '\n';
    return output;
  }

  // Violations summary header
  if (includeHeader) {
    output += '### 📊 Violations Summary\n\n';
  }

  // Summary list
  if (violations.largeFiles.length > 0) {
    output += `- **${violations.largeFiles.length}** file(s) exceed size limit\n`;
  }
  if (violations.exceedsFileLines.length > 0) {
    output += `- **${violations.exceedsFileLines.length}** file(s) exceed line limit\n`;
  }
  if (violations.exceedsAdditions) {
    output += '- **Total additions exceed limit**\n';
  }
  if (violations.exceedsFileCount) {
    output += '- **File count exceeds limit**\n';
  }
  output += '\n';

  // Large files detail table
  if (violations.largeFiles.length > 0) {
    output += '### 🚫 Large Files Detected\n\n';
    output += '| File | Size | Limit | Status |\n';
    output += '|------|------|-------|--------|\n';

    for (const violation of violations.largeFiles) {
      const status = violation.severity === 'critical' ? '🚫 Critical' : '⚠️ Warning';
      output += `| ${violation.file} | ${formatBytes(violation.actualValue)} | ${formatBytes(violation.limit)} | ${status} |\n`;
    }
    output += '\n';
  }

  // Files exceed line limit detail table
  if (violations.exceedsFileLines.length > 0) {
    output += '### ⚠️ Files Exceed Line Limit\n\n';
    output += '| File | Lines | Limit | Status |\n';
    output += '|------|-------|-------|--------|\n';

    for (const violation of violations.exceedsFileLines) {
      const status = violation.severity === 'critical' ? '🚫 Critical' : '⚠️ Warning';
      output += `| ${violation.file} | ${formatNumber(violation.actualValue)} | ${formatNumber(violation.limit)} | ${status} |\n`;
    }
    output += '\n';
  }

  return output;
}

/**
 * Format file details table
 * Displays file path, size, lines, and changes
 */
export function formatFileDetails(files: FileMetrics[], limit?: number): string {
  if (files.length === 0) {
    return '';
  }

  let output = '';
  output += '### 📈 Top Large Files\n\n';
  output += '| File | Size | Lines | Changes |\n';
  output += '|------|------|-------|----------|\n';

  // Sort by size descending and limit
  const sortedFiles = [...files].sort((a, b) => b.size - a.size);
  const displayFiles = limit ? sortedFiles.slice(0, limit) : sortedFiles;

  for (const file of displayFiles) {
    const changes = `+${file.additions}/-${file.deletions}`;
    output += `| ${file.filename} | ${formatBytes(file.size)} | ${formatNumber(file.lines)} | ${changes} |\n`;
  }
  output += '\n';

  return output;
}

/**
 * Escape special markdown characters
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]`])/g, '\\$1');
}
