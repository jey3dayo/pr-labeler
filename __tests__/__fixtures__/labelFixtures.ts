/**
 * Label Configuration Fixtures
 *
 * Provides default label configurations, thresholds, categories,
 * and factory functions for creating mock label data.
 *
 * Pattern inspired by action-cache's actionContextFixtures.ts
 */

import { DEFAULT_CATEGORIES } from '../../src/configs/categories.js';
import type { CategoryConfig, ComplexityConfig, SizeConfig } from '../../src/labeler-types.js';
import type { RiskConfig } from '../../src/types/config.js';

// ============================================================================
// Default Thresholds
// ============================================================================

/**
 * Default size thresholds
 */
export const defaultSizeThresholds = {
  small: 200,
  medium: 500,
  large: 1000,
  xlarge: 3000,
};

/**
 * Default complexity thresholds
 */
export const defaultComplexityThresholds = {
  medium: 10,
  high: 20,
};

/**
 * Relaxed size thresholds (for testing edge cases)
 */
export const relaxedSizeThresholds = {
  small: 500,
  medium: 1000,
  large: 2000,
  xlarge: 5000,
};

/**
 * Strict size thresholds (for testing edge cases)
 */
export const strictSizeThresholds = {
  small: 100,
  medium: 250,
  large: 500,
  xlarge: 1500,
};

/**
 * Relaxed complexity thresholds
 */
export const relaxedComplexityThresholds = {
  medium: 15,
  high: 30,
};

/**
 * Strict complexity thresholds
 */
export const strictComplexityThresholds = {
  medium: 5,
  high: 10,
};

// ============================================================================
// Default Configurations
// ============================================================================

/**
 * Default size configuration
 */
export const defaultSizeConfig: SizeConfig = {
  enabled: true,
  thresholds: defaultSizeThresholds,
};

/**
 * Default complexity configuration
 */
export const defaultComplexityConfig: ComplexityConfig = {
  enabled: true,
  metric: 'cyclomatic',
  thresholds: defaultComplexityThresholds,
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  exclude: ['**/dist/**', '**/build/**', '**/node_modules/**', '**/__tests__/**', '**/*.test.ts', '**/*.test.tsx'],
};

/**
 * Default risk configuration
 */
export const defaultRiskConfig: RiskConfig = {
  enabled: true,
  high_if_no_tests_for_core: true,
  core_paths: ['src/**'],
  config_files: ['.github/workflows/**', 'package.json', 'tsconfig.json'],
  use_ci_status: true,
};

// ============================================================================
// Default Categories
// ============================================================================

/**
 * Default category configurations
 */
export const defaultCategories: CategoryConfig[] = DEFAULT_CATEGORIES;

/**
 * Test category
 */
export const testCategory: CategoryConfig = {
  label: 'category/tests',
  patterns: ['__tests__/**', '**/*.test.ts'],
};

/**
 * CI/CD category
 */
export const ciCdCategory: CategoryConfig = {
  label: 'category/ci-cd',
  patterns: ['.github/workflows/**'],
};

/**
 * Documentation category
 */
export const docsCategory: CategoryConfig = {
  label: 'category/documentation',
  patterns: ['docs/**', '**/*.md'],
  exclude: ['.kiro/**', '.specify/**', 'spec/**', 'specs/**'],
};

/**
 * Configuration files category
 */
export const configCategory: CategoryConfig = {
  label: 'category/config',
  patterns: ['**/*.config.js', '**/*.config.ts', '**/tsconfig.json', '**/.eslintrc*'],
};

/**
 * Spec files category
 */
export const specCategory: CategoryConfig = {
  label: 'category/spec',
  patterns: ['.kiro/**', '.specify/**', 'spec/**', 'specs/**'],
};

/**
 * Dependencies category
 */
export const dependenciesCategory: CategoryConfig = {
  label: 'category/dependencies',
  patterns: ['**/package.json', '**/pnpm-lock.yaml', '**/yarn.lock', '**/package-lock.json'],
};

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a mock SizeConfig with optional overrides
 *
 * @example
 * const config = createMockSizeConfig({ thresholds: { small: 100, medium: 300, large: 600, xlarge: 2000 } });
 */
export const createMockSizeConfig = (overrides?: Partial<SizeConfig>): SizeConfig => ({
  ...defaultSizeConfig,
  ...overrides,
});

/**
 * Create a mock ComplexityConfig with optional overrides
 *
 * @example
 * const config = createMockComplexityConfig({ thresholds: { medium: 15, high: 30 } });
 */
export const createMockComplexityConfig = (overrides?: Partial<ComplexityConfig>): ComplexityConfig => ({
  ...defaultComplexityConfig,
  ...overrides,
});

/**
 * Create a mock RiskConfig with optional overrides
 *
 * @example
 * const config = createMockRiskConfig({ high_if_no_tests_for_core: false });
 */
export const createMockRiskConfig = (overrides?: Partial<RiskConfig>): RiskConfig => ({
  ...defaultRiskConfig,
  ...overrides,
});

/**
 * Create a mock CategoryConfig with optional overrides
 *
 * @example
 * const category = createMockCategoryConfig({ label: 'custom/label', patterns: ['custom/**'] });
 */
export const createMockCategoryConfig = (overrides?: Partial<CategoryConfig>): CategoryConfig => ({
  label: 'category/custom',
  patterns: ['custom/**'],
  ...overrides,
});

/**
 * Create mock categories array
 *
 * @example
 * const categories = createMockCategories([testCategory, docsCategory]);
 */
export const createMockCategories = (categories?: CategoryConfig[]): CategoryConfig[] => {
  return categories ?? defaultCategories;
};
