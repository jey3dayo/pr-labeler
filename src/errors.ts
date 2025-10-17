/**
 * Error types for PR Metrics Action
 * Following Railway-Oriented Programming pattern with neverthrow
 */

export interface Violations {
  largeFiles: ViolationDetail[];
  exceedsFileLines: ViolationDetail[];
  exceedsAdditions: boolean;
  exceedsFileCount: boolean;
}

export interface ViolationDetail {
  file: string;
  actualValue: number;
  limit: number;
  violationType: 'size' | 'lines';
  severity: 'critical' | 'warning';
}

// Error Type 1: File Analysis Error
export interface FileAnalysisError {
  type: 'FileAnalysisError';
  file: string;
  message: string;
}

// Error Type 2: GitHub API Error
export interface GitHubAPIError {
  type: 'GitHubAPIError';
  status?: number;
  message: string;
}

// Error Type 3: Configuration Error
export interface ConfigurationError {
  type: 'ConfigurationError';
  field: string;
  value: unknown;
  message: string;
}

// Error Type 4: Parse Error
export interface ParseError {
  type: 'ParseError';
  input: string;
  message: string;
}

// Error Type 5: File System Error
export interface FileSystemError {
  type: 'FileSystemError';
  path?: string;
  message: string;
}

// Error Type 6: Violation Error
export interface ViolationError {
  type: 'ViolationError';
  violations: Violations;
  message: string;
}

// Error Type 7: Diff Error
export interface DiffError {
  type: 'DiffError';
  source: 'local-git' | 'github-api' | 'both';
  message: string;
}

// Error Type 8: Pattern Error
export interface PatternError {
  type: 'PatternError';
  pattern: string;
  message: string;
}

// Error Type 9: Cache Error
export interface CacheError {
  type: 'CacheError';
  key?: string;
  message: string;
}

// Union type for all application errors
export type AppError =
  | FileAnalysisError
  | GitHubAPIError
  | ConfigurationError
  | ParseError
  | FileSystemError
  | ViolationError
  | DiffError
  | PatternError
  | CacheError;

// Error creation helpers
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

// Re-export from neverthrow for convenience
export { Result, ok, err, ResultAsync, okAsync, errAsync } from 'neverthrow';
export type { Ok, Err } from 'neverthrow';
