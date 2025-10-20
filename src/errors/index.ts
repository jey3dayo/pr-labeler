/**
 * Error handling module
 * Re-exports all error types, factories, and guards for convenience
 */

// Export all types
export type {
  AppError,
  CacheError,
  ComplexityAnalysisError,
  ConfigurationError,
  DiffError,
  FileAnalysisError,
  FileSystemError,
  GitHubAPIError,
  ParseError,
  PatternError,
  PermissionError,
  RateLimitError,
  UnexpectedError,
  ViolationDetail,
  ViolationError,
  Violations,
} from './types.js';

// Export all factory functions
export {
  createCacheError,
  createComplexityAnalysisError,
  createConfigurationError,
  createDiffError,
  createFileAnalysisError,
  createFileSystemError,
  createGitHubAPIError,
  createParseError,
  createPatternError,
  createPermissionError,
  createRateLimitError,
  createUnexpectedError,
  createViolationError,
} from './factories.js';

// Export all type guard functions
export {
  extractErrorMessage,
  isComplexityAnalysisError,
  isError,
  isErrorWithMessage,
  isErrorWithTypeAndMessage,
  isObject,
  isString,
} from './guards.js';

// Re-export from neverthrow for convenience
export type { Err, Ok } from 'neverthrow';
export { err, errAsync, ok, okAsync, Result, ResultAsync } from 'neverthrow';
