/**
 * Path Utilities
 *
 * Common utilities for normalizing file paths and patterns for consistent matching across platforms
 */

/**
 * Normalize file paths for consistent matching
 *
 * Converts backslashes to forward slashes for cross-platform compatibility
 * and removes leading "./" from paths.
 *
 * This function ensures that file paths are normalized to POSIX-style (forward slash separator)
 * regardless of the operating system, enabling consistent pattern matching behavior.
 *
 * @param path - The file path to normalize
 * @returns Normalized path with forward slashes and no leading "./"
 *
 * @example
 * ```typescript
 * normalizePath('src\\components\\Button.tsx')
 * // Returns: "src/components/Button.tsx"
 *
 * normalizePath('./src/utils/helpers.ts')
 * // Returns: "src/utils/helpers.ts"
 *
 * normalizePath('README.md')
 * // Returns: "README.md"
 * ```
 */
export function normalizePath(path: string): string {
  // Replace backslashes with forward slashes for cross-platform compatibility
  let normalized = path.replace(/\\/g, '/');

  // Remove leading ./ from the path
  if (normalized.startsWith('./')) {
    normalized = normalized.slice(2);
  }

  return normalized;
}
