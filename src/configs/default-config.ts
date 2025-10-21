/**
 * Default configuration for PR Labeler
 */

import type { LabelerConfig } from '../labeler-types.js';
import { DEFAULT_CATEGORIES } from './categories.js';

/**
 * Default labeler configuration
 */
export const DEFAULT_LABELER_CONFIG: LabelerConfig = {
  size: {
    enabled: true, // サイズラベルはデフォルトで有効
    thresholds: {
      small: 100,
      medium: 500,
      large: 1000,
    },
  },
  complexity: {
    enabled: true,
    metric: 'cyclomatic',
    thresholds: {
      medium: 10,
      high: 20,
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    exclude: [
      '**/dist/**',
      '**/build/**',
      '**/node_modules/**',
      '**/vendor/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.test.js',
      '**/*.test.jsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.spec.js',
      '**/*.spec.jsx',
      '**/*.generated.ts',
      '**/*.generated.js',
      '**/__generated__/**',
    ],
  },
  categoryLabeling: {
    enabled: true, // カテゴリラベルはデフォルトで有効
  },
  categories: DEFAULT_CATEGORIES,
  risk: {
    enabled: true, // リスクラベルはデフォルトで有効
    high_if_no_tests_for_core: true,
    core_paths: ['src/**'],
    config_files: ['.github/workflows/**', 'package.json', 'tsconfig.json'],
    use_ci_status: true,
  },
  exclude: {
    additional: [],
  },
  labels: {
    create_missing: true,
    namespace_policies: {
      'size/*': 'replace',
      'category/*': 'additive',
      'complexity/*': 'replace',
      'risk/*': 'replace',
    },
  },
  runtime: {
    fail_on_error: false,
    dry_run: false,
  },
};
