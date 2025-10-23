export type { AppError, CacheError, ComplexityAnalysisError, ConfigurationError, DiffError, FileAnalysisError, FileSystemError, GitHubAPIError, ParseError, PatternError, PermissionError, RateLimitError, UnexpectedError, ViolationDetail, ViolationError, Violations, } from './types.js';
export { BaseError, type ErrorLevel } from './base-error.js';
export { createCacheError, createComplexityAnalysisError, createConfigurationError, createDiffError, createFileAnalysisError, createFileSystemError, createGitHubAPIError, createParseError, createPatternError, createPermissionError, createRateLimitError, createUnexpectedError, createViolationError, } from './factories.js';
export { extractErrorStatus, isComplexityAnalysisError, isError, isErrorWithMessage, isErrorWithTypeAndMessage, isObject, isString, } from './guards.js';
export { ensureError, extractAggregateError } from './helpers.js';
export type { Err, Ok } from 'neverthrow';
export { err, errAsync, ok, okAsync, Result, ResultAsync } from 'neverthrow';
