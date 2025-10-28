/**
 * Default label configurations
 * Contains size labels, violation labels, and label prefixes
 */

/**
 * Label prefixes
 */
export const AUTO_LABEL_PREFIX = 'auto/';

/**
 * Violation label mappings
 */
export const VIOLATION_LABELS = {
  largeFiles: 'auto/large-files',
  tooManyLines: 'auto/too-many-lines',
  excessiveChanges: 'auto/excessive-changes',
  tooManyFiles: 'auto/too-many-files',
} as const;

/**
 * Complexity labels for code complexity analysis
 */
export const COMPLEXITY_LABELS = {
  medium: 'complexity/medium',
  high: 'complexity/high',
} as const;

/**
 * Risk labels for PR risk assessment
 */
export const RISK_LABELS = {
  high: 'risk/high',
  medium: 'risk/medium',
} as const;
