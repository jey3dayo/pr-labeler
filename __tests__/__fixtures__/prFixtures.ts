/**
 * PR Metrics Fixtures
 *
 * Provides default PR metrics, file metrics, and factory functions
 * for creating mock PR data with flexible overrides.
 *
 * Pattern inspired by action-cache's actionContextFixtures.ts
 */

import type { ComplexityMetrics, FileComplexity, FileMetrics, PRMetrics } from '../../src/labeler-types.js';

// ============================================================================
// Default File Metrics
// ============================================================================

/**
 * Small TypeScript file (50 additions)
 */
export const smallTsFile: FileMetrics = {
  path: 'src/utils/helper.ts',
  size: 3000,
  lines: 80,
  additions: 50,
  deletions: 10,
};

/**
 * Medium-sized test file (100 additions)
 */
export const mediumTestFile: FileMetrics = {
  path: '__tests__/feature.test.ts',
  size: 5000,
  lines: 150,
  additions: 100,
  deletions: 20,
};

/**
 * Large documentation file (200 additions)
 */
export const largeDocFile: FileMetrics = {
  path: 'docs/architecture.md',
  size: 10000,
  lines: 300,
  additions: 200,
  deletions: 50,
};

/**
 * Configuration file (20 additions)
 */
export const configFile: FileMetrics = {
  path: '.github/workflows/ci.yml',
  size: 1500,
  lines: 50,
  additions: 20,
  deletions: 5,
};

// ============================================================================
// Default Complexity Metrics
// ============================================================================

/**
 * Low complexity function
 */
export const lowComplexityFunction: FileComplexity = {
  path: 'src/utils/simple.ts',
  complexity: 3,
  functions: [{ name: 'simpleFunction', complexity: 3, loc: { start: 1, end: 10 } }],
};

/**
 * Medium complexity function
 */
export const mediumComplexityFunction: FileComplexity = {
  path: 'src/services/processor.ts',
  complexity: 15,
  functions: [{ name: 'processData', complexity: 15, loc: { start: 1, end: 50 } }],
};

/**
 * High complexity function
 */
export const highComplexityFunction: FileComplexity = {
  path: 'src/core/engine.ts',
  complexity: 25,
  functions: [{ name: 'complexEngine', complexity: 25, loc: { start: 1, end: 100 } }],
};

/**
 * Default complexity metrics
 */
export const defaultComplexityMetrics: ComplexityMetrics = {
  maxComplexity: 15,
  avgComplexity: 8.5,
  analyzedFiles: 3,
  files: [lowComplexityFunction, mediumComplexityFunction],
  skippedFiles: [],
  syntaxErrorFiles: [],
  truncated: false,
  hasTsconfig: true,
};

// ============================================================================
// Default PR Metrics
// ============================================================================

/**
 * Small PR (< 200 additions)
 */
export const smallPRMetrics: PRMetrics = {
  totalAdditions: 150,
  excludedAdditions: 0,
  files: [smallTsFile, mediumTestFile],
};

/**
 * Medium PR (200-500 additions)
 */
export const mediumPRMetrics: PRMetrics = {
  totalAdditions: 350,
  excludedAdditions: 0,
  files: [smallTsFile, mediumTestFile, largeDocFile],
};

/**
 * Large PR (500-1000 additions)
 */
export const largePRMetrics: PRMetrics = {
  totalAdditions: 750,
  excludedAdditions: 0,
  files: [smallTsFile, mediumTestFile, largeDocFile, { ...largeDocFile, path: 'docs/api.md', additions: 400 }],
};

/**
 * XLarge PR (1000-3000 additions)
 */
export const xlargePRMetrics: PRMetrics = {
  totalAdditions: 2000,
  excludedAdditions: 0,
  files: [
    smallTsFile,
    mediumTestFile,
    largeDocFile,
    { ...largeDocFile, path: 'docs/api.md', additions: 800 },
    { ...largeDocFile, path: 'docs/guide.md', additions: 750 },
  ],
};

/**
 * XXLarge PR (>= 3000 additions)
 */
export const xxlargePRMetrics: PRMetrics = {
  totalAdditions: 5000,
  excludedAdditions: 0,
  files: [
    smallTsFile,
    mediumTestFile,
    largeDocFile,
    { ...largeDocFile, path: 'docs/api.md', additions: 1500 },
    { ...largeDocFile, path: 'docs/guide.md', additions: 1500 },
    { ...largeDocFile, path: 'docs/tutorial.md', additions: 1500 },
  ],
};

/**
 * Default PR metrics (medium size)
 */
export const defaultPRMetrics: PRMetrics = mediumPRMetrics;

/**
 * PR with complexity metrics
 */
export const prWithComplexity: PRMetrics = {
  ...mediumPRMetrics,
  complexity: defaultComplexityMetrics,
};

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a mock FileMetrics with optional overrides
 *
 * @example
 * const file = createMockFileMetrics({ path: 'src/custom.ts', additions: 100 });
 */
export const createMockFileMetrics = (overrides?: Partial<FileMetrics>): FileMetrics => ({
  ...smallTsFile,
  ...overrides,
});

/**
 * Create a mock PRMetrics with optional overrides
 *
 * @example
 * const pr = createMockPRMetrics({ totalAdditions: 1000 });
 */
export const createMockPRMetrics = (overrides?: Partial<PRMetrics>): PRMetrics => ({
  ...defaultPRMetrics,
  ...overrides,
});

/**
 * Create a mock ComplexityMetrics with optional overrides
 *
 * @example
 * const complexity = createMockComplexityMetrics({ maxComplexity: 30 });
 */
export const createMockComplexityMetrics = (overrides?: Partial<ComplexityMetrics>): ComplexityMetrics => ({
  ...defaultComplexityMetrics,
  ...overrides,
});

/**
 * Create a mock PR with specific size category
 *
 * @example
 * const pr = createPRBySize('large');
 */
export const createPRBySize = (size: 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge'): PRMetrics => {
  switch (size) {
    case 'small':
      return smallPRMetrics;
    case 'medium':
      return mediumPRMetrics;
    case 'large':
      return largePRMetrics;
    case 'xlarge':
      return xlargePRMetrics;
    case 'xxlarge':
      return xxlargePRMetrics;
  }
};
