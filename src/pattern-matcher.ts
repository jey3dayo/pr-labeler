/**
 * Pattern matching for file exclusion
 * Handles default exclusion patterns and custom pattern matching
 */

import { minimatch } from 'minimatch';

import { DEFAULT_EXCLUDE_PATTERNS } from './configs/default-excludes.js';
import { normalizePath } from './utils/path-utils.js';

/**
 * Get the default exclusion patterns
 */
export function getDefaultExcludePatterns(): string[] {
  return [...DEFAULT_EXCLUDE_PATTERNS];
}

/**
 * Normalize file paths and patterns for consistent matching
 * Converts backslashes to forward slashes and removes leading ./
 */
export function normalizePattern(pattern: string): string {
  return normalizePath(pattern);
}

/**
 * Check if a file path matches any of the exclusion patterns
 * @param filePath - The file path to check
 * @param patterns - Array of glob patterns to match against
 * @returns true if the file should be excluded, false otherwise
 */
export function isExcluded(filePath: string, patterns: string[]): boolean {
  // Empty pattern array means nothing is excluded
  if (patterns.length === 0) {
    return false;
  }

  // Normalize the file path
  const normalizedPath = normalizePattern(filePath);

  // Check if the path matches any exclusion pattern
  for (const pattern of patterns) {
    const normalizedPattern = normalizePattern(pattern);

    // Use minimatch for glob pattern matching
    // matchBase is only enabled for simple patterns (no slash)
    const options = {
      dot: true,
      matchBase: !normalizedPattern.includes('/'),
      windowsPathsNoEscape: true,
    };

    if (minimatch(normalizedPath, normalizedPattern, options)) {
      return true;
    }
  }

  return false;
}
