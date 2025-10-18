/**
 * Pattern matching for file exclusion
 * Handles default exclusion patterns and custom pattern matching
 */

import { minimatch } from 'minimatch';

/**
 * Default exclusion patterns for common files that should be ignored
 * Includes: lock files, dependencies, build outputs, generated files, etc.
 */
const DEFAULT_EXCLUDE_PATTERNS: string[] = [
  // Lock files
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'Gemfile.lock',
  'Cargo.lock',
  'composer.lock',
  'poetry.lock',
  'Pipfile.lock',
  'bun.lockb',
  'deno.lock',
  '*.lock',

  // Dependencies
  '**/node_modules/**',
  '**/vendor/**',
  '.bundle/**',
  '**/bower_components/**',

  // Build outputs
  'dist/**',
  'build/**',
  'out/**',
  'output/**',
  'target/**',
  '.next/**',
  '_next/**',
  '.nuxt/**',
  '.output/**',

  // Minified and bundled files
  '*.min.js',
  '*.min.css',
  '*.bundle.js',
  '*.bundle.css',
  '*.chunk.js',
  '*.chunk.css',

  // Source maps
  '*.map',
  '*.js.map',
  '*.css.map',

  // Test coverage
  'coverage/**',
  '.nyc_output/**',
  'reports/**',
  'test-results/**',

  // Logs
  '*.log',
  'logs/**',
  'npm-debug.log*',
  'yarn-debug.log*',
  'yarn-error.log*',
  'lerna-debug.log*',

  // IDE and editor files
  '.vscode/**',
  '.idea/**',
  '*.swp',
  '*.swo',
  '*.swn',
  '.DS_Store',
  'Thumbs.db',
  'desktop.ini',

  // Git
  '.git/**',
  '.gitignore',
  '.gitattributes',

  // Generated files
  '*.generated.*',
  '*.gen.ts',
  '*.gen.js',
  '*.pb.go',
  '*.pb.js',
  '*.pb.ts',
  '*_pb2.py',
  '*.g.dart',

  // Cache directories
  '.cache/**',
  '.parcel-cache/**',
  '.turbo/**',
  '.webpack-cache/**',
  '.eslintcache',
  '.stylelintcache',
  '.prettiercache',

  // Temporary files
  '*.tmp',
  '*.temp',
  'tmp/**',
  'temp/**',
  '.tmp/**',
  '.temp/**',

  // Environment files (often contain secrets)
  '.env',
  '.env.*',
  // Note: .env.example and .env.template are intentionally not excluded
  // as they are typically safe template files

  // Database files
  '*.sqlite',
  '*.sqlite3',
  '*.db',
  '*.db-journal',

  // Binary and media files
  '*.exe',
  '*.dll',
  '*.so',
  '*.dylib',
  '*.pyc',
  '*.pyo',
  '*.wasm',
];

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
  // Replace backslashes with forward slashes for cross-platform compatibility
  let normalized = pattern.replace(/\\/g, '/');

  // Remove leading ./ from the pattern
  if (normalized.startsWith('./')) {
    normalized = normalized.slice(2);
  }

  return normalized;
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
