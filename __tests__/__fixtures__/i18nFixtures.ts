/**
 * i18n Test Fixtures
 *
 * Provides setup/teardown helpers and utilities for i18n testing.
 * Handles environment backup, i18n initialization, and language switching.
 *
 * Pattern inspired by action-cache's actionContextFixtures.ts
 */

import { changeLanguage, initializeI18n, resetI18n } from '../../src/i18n.js';

// ============================================================================
// Test Setup/Teardown Helpers
// ============================================================================

/**
 * Backup and restore environment for i18n tests
 *
 * @returns Restore function
 *
 * @example
 * beforeEach(() => {
 *   restoreEnv = setupI18nEnvironment();
 * });
 *
 * afterEach(() => {
 *   restoreEnv();
 * });
 */
export const setupI18nEnvironment = (): (() => void) => {
  const originalEnv = { ...process.env };
  resetI18n();

  return () => {
    process.env = originalEnv;
    resetI18n();
  };
};

/**
 * Setup i18n test with English
 *
 * @example
 * beforeEach(() => {
 *   setupI18nTestEnglish();
 * });
 */
export const setupI18nTestEnglish = (): void => {
  resetI18n();
  initializeI18n('en');
  changeLanguage('en');
};

/**
 * Setup i18n test with Japanese
 *
 * @example
 * beforeEach(() => {
 *   setupI18nTestJapanese();
 * });
 */
export const setupI18nTestJapanese = (): void => {
  resetI18n();
  initializeI18n('ja');
  changeLanguage('ja');
};

/**
 * Teardown i18n test
 *
 * @example
 * afterEach(() => {
 *   teardownI18nTest();
 * });
 */
export const teardownI18nTest = (): void => {
  resetI18n();
};

// ============================================================================
// Test Wrapper Functions
// ============================================================================

/**
 * Run a test function with i18n initialized to English
 *
 * @example
 * it('should work with English', () => {
 *   withI18nEnglish(() => {
 *     // test code
 *   });
 * });
 */
export const withI18nEnglish = <T>(fn: () => T): T => {
  setupI18nTestEnglish();
  try {
    return fn();
  } finally {
    teardownI18nTest();
  }
};

/**
 * Run a test function with i18n initialized to Japanese
 *
 * @example
 * it('should work with Japanese', () => {
 *   withI18nJapanese(() => {
 *     // test code
 *   });
 * });
 */
export const withI18nJapanese = <T>(fn: () => T): T => {
  setupI18nTestJapanese();
  try {
    return fn();
  } finally {
    teardownI18nTest();
  }
};

/**
 * Run a test function with i18n initialized to a specific language
 *
 * @example
 * it('should work with custom language', () => {
 *   withI18nLanguage('ja', () => {
 *     // test code
 *   });
 * });
 */
export const withI18nLanguage = <T>(language: string, fn: () => T): T => {
  resetI18n();
  initializeI18n(language);
  changeLanguage(language);

  try {
    return fn();
  } finally {
    teardownI18nTest();
  }
};

// ============================================================================
// Environment Variable Helpers
// ============================================================================

/**
 * Setup language environment variable
 *
 * @example
 * setupLanguageEnv('ja');
 */
export const setupLanguageEnv = (language: string): void => {
  process.env['LANGUAGE'] = language;
};

/**
 * Clear language environment variable
 *
 * @example
 * clearLanguageEnv();
 */
export const clearLanguageEnv = (): void => {
  delete process.env['LANGUAGE'];
};

/**
 * Setup multiple environment variables for i18n testing
 *
 * @example
 * setupI18nEnvVars({ LANGUAGE: 'ja', GITHUB_ACTIONS: 'true' });
 */
export const setupI18nEnvVars = (env: Record<string, string>): void => {
  Object.entries(env).forEach(([key, value]) => {
    process.env[key] = value;
  });
};
