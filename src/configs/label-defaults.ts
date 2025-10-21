/**
 * Default label configurations
 * Contains size labels, violation labels, and label prefixes
 */

/**
 * Label prefixes
 */
export const SIZE_LABEL_PREFIX = 'size:';
export const AUTO_LABEL_PREFIX = 'auto:';

/**
 * Size label values
 */
export const SIZE_LABELS = {
  S: 'size:S',
  M: 'size:M',
  L: 'size:L',
  XL: 'size:XL',
  XXL: 'size:XXL',
} as const;

/**
 * Violation label mappings
 */
export const VIOLATION_LABELS = {
  largeFiles: 'auto:large-files',
  tooManyLines: 'auto:too-many-lines',
  excessiveChanges: 'auto:excessive-changes',
  tooManyFiles: 'auto:too-many-files',
} as const;
