/**
 * Error factory functions for creating typed error objects
 */

import type {
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
  ViolationError,
  Violations,
} from './types.js';

// ============================================================================
// Core Error Factories
// ============================================================================

export const createFileAnalysisError = (file: string, message: string): FileAnalysisError => ({
  type: 'FileAnalysisError',
  file,
  message,
});

export const createGitHubAPIError = (message: string, status?: number): GitHubAPIError => {
  const error: GitHubAPIError = {
    type: 'GitHubAPIError',
    message,
  };
  if (status !== undefined) {
    error.status = status;
  }
  return error;
};

export const createConfigurationError = (field: string, value: unknown, message: string): ConfigurationError => ({
  type: 'ConfigurationError',
  field,
  value,
  message,
});

export const createParseError = (input: string, message: string): ParseError => ({
  type: 'ParseError',
  input,
  message,
});

export const createFileSystemError = (message: string, path?: string): FileSystemError => {
  const error: FileSystemError = {
    type: 'FileSystemError',
    message,
  };
  if (path !== undefined) {
    error.path = path;
  }
  return error;
};

export const createViolationError = (violations: Violations, message: string): ViolationError => ({
  type: 'ViolationError',
  violations,
  message,
});

export const createDiffError = (source: 'local-git' | 'github-api' | 'both', message: string): DiffError => ({
  type: 'DiffError',
  source,
  message,
});

export const createPatternError = (pattern: string, message: string): PatternError => ({
  type: 'PatternError',
  pattern,
  message,
});

export const createCacheError = (message: string, key?: string): CacheError => {
  const error: CacheError = {
    type: 'CacheError',
    message,
  };
  if (key !== undefined) {
    error.key = key;
  }
  return error;
};

export const createComplexityAnalysisError = (
  reason: ComplexityAnalysisError['reason'],
  message: string,
  options?: Partial<Pick<ComplexityAnalysisError, 'filename' | 'details' | 'fileSize' | 'maxSize' | 'timeoutSeconds'>>,
): ComplexityAnalysisError => {
  const error: ComplexityAnalysisError = {
    type: 'ComplexityAnalysisError',
    reason,
    message,
  };
  if (options?.filename !== undefined) {
    error.filename = options.filename;
  }
  if (options?.details !== undefined) {
    error.details = options.details;
  }
  if (options?.fileSize !== undefined) {
    error.fileSize = options.fileSize;
  }
  if (options?.maxSize !== undefined) {
    error.maxSize = options.maxSize;
  }
  if (options?.timeoutSeconds !== undefined) {
    error.timeoutSeconds = options.timeoutSeconds;
  }
  return error;
};

// ============================================================================
// Directory-Based Labeler: Error Factories
// ============================================================================

export const createPermissionError = (required: string, message: string): PermissionError => ({
  type: 'PermissionError',
  required,
  message,
});

export const createRateLimitError = (message: string, retryAfter?: number): RateLimitError => {
  const error: RateLimitError = {
    type: 'RateLimitError',
    message,
  };
  if (retryAfter !== undefined) {
    error.retryAfter = retryAfter;
  }
  return error;
};

export const createUnexpectedError = (message: string, originalError?: unknown): UnexpectedError => {
  const error: UnexpectedError = {
    type: 'UnexpectedError',
    message,
  };
  if (originalError !== undefined) {
    error.originalError = originalError;
  }
  return error;
};
