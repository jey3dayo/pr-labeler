/**
 * GitHub Actions Context Fixtures
 *
 * Provides mock helpers for @actions/core and @actions/github modules,
 * environment variable setup, and common test patterns.
 *
 * Pattern inspired by action-cache's actionContextFixtures.ts
 */

import { vi } from 'vitest';

// ============================================================================
// Environment Variable Helpers
// ============================================================================

/**
 * Backup and restore environment variables
 *
 * @returns Restore function
 *
 * @example
 * beforeEach(() => {
 *   restoreEnv = setupActionsEnvironment();
 * });
 *
 * afterEach(() => {
 *   restoreEnv();
 * });
 */
export const setupActionsEnvironment = (): (() => void) => {
  const originalEnv = { ...process.env };

  return () => {
    process.env = originalEnv;
  };
};

/**
 * Setup GitHub Actions environment variables
 *
 * @example
 * setupGitHubEnvVars({
 *   GITHUB_TOKEN: 'test-token',
 *   GITHUB_REPOSITORY: 'owner/repo',
 *   GITHUB_SHA: 'abc123',
 * });
 */
export const setupGitHubEnvVars = (env: Record<string, string>): void => {
  Object.entries(env).forEach(([key, value]) => {
    process.env[key] = value;
  });
};

/**
 * Clear GitHub Actions environment variables
 *
 * @example
 * clearGitHubEnvVars(['GITHUB_TOKEN', 'GITHUB_REPOSITORY']);
 */
export const clearGitHubEnvVars = (keys: string[]): void => {
  keys.forEach(key => {
    delete process.env[key];
  });
};

/**
 * Clear common GitHub token environment variables
 *
 * @example
 * clearGitHubTokens();
 */
export const clearGitHubTokens = (): void => {
  delete process.env['GITHUB_TOKEN'];
  delete process.env['GH_TOKEN'];
};

// ============================================================================
// @actions/core Mock Helpers
// ============================================================================

/**
 * Setup default @actions/core mocks
 *
 * @example
 * beforeEach(() => {
 *   setupActionsCoreM ocks();
 * });
 */
export const setupActionsCoreMocks = (): void => {
  vi.clearAllMocks();
};

/**
 * Create mock getInput function with predefined inputs
 *
 * @example
 * const getInputMock = createMockGetInput({
 *   github_token: 'test-token',
 *   language: 'en',
 * });
 * vi.mocked(core.getInput).mockImplementation(getInputMock);
 */
export const createMockGetInput = (inputs: Record<string, string>) => {
  return (name: string): string => {
    return inputs[name] ?? '';
  };
};

/**
 * Create mock getBooleanInput function with predefined inputs
 *
 * @example
 * const getBooleanInputMock = createMockGetBooleanInput({
 *   enable_size: true,
 *   enable_complexity: false,
 * });
 * vi.mocked(core.getBooleanInput).mockImplementation(getBooleanInputMock);
 */
export const createMockGetBooleanInput = (inputs: Record<string, boolean>) => {
  return (name: string): boolean => {
    return inputs[name] ?? false;
  };
};

// ============================================================================
// Default Mock Values
// ============================================================================

/**
 * Default GitHub token for testing
 */
export const DEFAULT_GITHUB_TOKEN = 'test-github-token-123';

/**
 * Default repository for testing
 */
export const DEFAULT_GITHUB_REPOSITORY = 'owner/test-repo';

/**
 * Default SHA for testing
 */
export const DEFAULT_GITHUB_SHA = 'abc123def456';

/**
 * Default pull request number for testing
 */
export const DEFAULT_PR_NUMBER = 42;

/**
 * Default inputs for testing
 */
export const DEFAULT_ACTION_INPUTS = {
  github_token: DEFAULT_GITHUB_TOKEN,
  language: 'en',
  enable_size: 'true',
  enable_complexity: 'false',
  enable_category: 'true',
  enable_risk: 'true',
  file_size_limit: '100000',
  file_lines_limit: '500',
  pr_additions_limit: '5000',
  pr_files_limit: '50',
  size_thresholds_v2: '200,500,1000,3000',
  complexity_thresholds_v2: '10,20',
  auto_remove_labels: 'true',
  skip_draft_pr: 'false',
  comment_on_pr: 'auto',
  enable_summary: 'true',
  enable_directory_labeling: 'false',
  max_labels: '100',
  use_default_excludes: 'true',
};

// ============================================================================
// Test Wrapper Functions
// ============================================================================

/**
 * Run a test with GitHub Actions environment setup
 *
 * @example
 * it('should work with Actions environment', () => {
 *   withActionsEnvironment(() => {
 *     // test code
 *   });
 * });
 */
export const withActionsEnvironment = <T>(fn: () => T): T => {
  const restore = setupActionsEnvironment();
  setupGitHubEnvVars({
    GITHUB_TOKEN: DEFAULT_GITHUB_TOKEN,
    GITHUB_REPOSITORY: DEFAULT_GITHUB_REPOSITORY,
    GITHUB_SHA: DEFAULT_GITHUB_SHA,
  });

  try {
    return fn();
  } finally {
    restore();
  }
};

/**
 * Run a test with clean environment (no GitHub tokens)
 *
 * @example
 * it('should handle missing token', () => {
 *   withCleanEnvironment(() => {
 *     // test code
 *   });
 * });
 */
export const withCleanEnvironment = <T>(fn: () => T): T => {
  const restore = setupActionsEnvironment();
  clearGitHubTokens();

  try {
    return fn();
  } finally {
    restore();
  }
};
