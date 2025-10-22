/**
 * Default configuration for Directory-Based Labeler
 * Contains default options, namespace policies, and exclusion patterns
 */

import type { MinimatchOptions, NamespacePolicy } from '../directory-labeler/types.js';

/**
 * Default minimatch options
 */
export const DEFAULT_OPTIONS: Required<MinimatchOptions> = {
  dot: true,
  nocase: false,
  matchBase: false,
} as const;

/**
 * Default namespace policies
 */
export const DEFAULT_NAMESPACES: Required<NamespacePolicy> = {
  exclusive: ['size', 'area', 'type'],
  additive: ['scope', 'meta'],
} as const;

/**
 * Default exclusion patterns for Directory-Based Labeler
 *
 * These patterns are applied at the Pattern Matcher level and
 * combined with user-defined exclusion patterns using logical OR.
 */
export const DEFAULT_EXCLUDES: readonly string[] = [
  '.vscode/**',
  '.idea/**',
  '.husky/**',
  'node_modules/**',
  '.git/**',
  '**/*.lock',
  '**/package-lock.json',
  '**/pnpm-lock.yaml',
  '**/yarn.lock',
  '**/composer.lock',
  '**/Gemfile.lock',
  '**/Cargo.lock',
  '**/poetry.lock',
  '**/Pipfile.lock',
  '**/.DS_Store',
  '**/Thumbs.db',
] as const;

/**
 * Default label color for auto-created labels
 * Fixed value (cannot be customized)
 */
export const DEFAULT_LABEL_COLOR = 'cccccc' as const;

/**
 * Default label description for auto-created labels
 * Fixed value (cannot be customized)
 */
export const DEFAULT_LABEL_DESCRIPTION = '' as const;
