/**
 * Namespace utilities for label manipulation
 * Shared across label-decision-engine, label-applicator, and directory-labeler
 */

/**
 * Extract namespace from label (supports both colon and slash delimiters)
 * @param label - Full label name (e.g., "size/small" or "build:success")
 * @param delimiter - Character used as namespace separator (default: "/")
 * @returns Namespace or null if delimiter not found
 * @example
 * extractNamespace("size/small") // returns "size"
 * extractNamespace("build:success", ":") // returns "build"
 * extractNamespace("no-namespace") // returns null
 */
export function extractNamespace(label: string, delimiter: string = '/'): string | null {
  const index = label.indexOf(delimiter);
  if (index === -1) {
    return null;
  }
  return label.substring(0, index);
}

/**
 * Check if namespace matches a pattern
 * Supports trailing /* wildcard for namespace-level matching
 * @param namespace - Namespace to match
 * @param pattern - Pattern (supports trailing /* wildcard)
 * @returns True if namespace matches pattern
 * @example
 * matchesNamespacePattern("size", "size") // returns true
 * matchesNamespacePattern("size", "size/*") // returns true
 * matchesNamespacePattern("category", "size") // returns false
 */
export function matchesNamespacePattern(namespace: string, pattern: string): boolean {
  const normalizedPattern = pattern.endsWith('/*') ? pattern.slice(0, -2) : pattern;
  return namespace === normalizedPattern;
}
