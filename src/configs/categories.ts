/**
 * Default category configurations for PR Labeler
 */

import type { CategoryConfig } from '../types/config.js';

/**
 * Default categories for PR classification
 */
export const DEFAULT_CATEGORIES: CategoryConfig[] = [
  {
    label: 'category/tests',
    patterns: ['__tests__/**', '**/*.test.ts', '**/*.test.tsx'],
  },
  {
    label: 'category/ci-cd',
    patterns: ['.github/workflows/**'],
  },
  {
    label: 'category/documentation',
    patterns: ['docs/**', '**/*.md'],
    exclude: ['.kiro/**', '.specify/**', 'spec/**', 'specs/**'],
  },
  {
    label: 'category/config',
    patterns: [
      '**/*.config.js',
      '**/*.config.ts',
      '**/*.config.mjs',
      '**/*.config.cjs',
      '**/tsconfig.json',
      '**/jsconfig.json',
      '**/.editorconfig',
      '**/.eslintrc*',
      '**/.prettierrc*',
      '**/.prettierignore',
      '**/prettier.config.*',
      '**/eslint.config.*',
      '**/vitest.config.*',
      '**/vite.config.*',
      '**/.markdownlint-cli2.jsonc',
      '**/mise.toml',
      '**/action.y?(a)ml',
      '**/configs/**/*.ts',
      '**/configs/**/*.js',
      '**/configs/**/*.mjs',
      '**/configs/**/*.cjs',
      '**/configs/**/*.json',
    ],
  },
  {
    label: 'category/spec',
    patterns: ['.kiro/**', '.specify/**', 'spec/**', 'specs/**'],
  },
  {
    label: 'category/dependencies',
    patterns: [
      '**/package.json',
      '**/pnpm-lock.yaml',
      '**/yarn.lock',
      '**/package-lock.json',
      '**/go.mod',
      '**/go.sum',
      '**/requirements.txt',
      '**/Pipfile',
      '**/Pipfile.lock',
      '**/poetry.lock',
      '**/pyproject.toml',
      '**/Cargo.toml',
      '**/Cargo.lock',
      '**/Gemfile',
      '**/Gemfile.lock',
    ],
  },
];
