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

// Error Type 10: Complexity Analysis Error
export interface ComplexityAnalysisError {
  type: 'ComplexityAnalysisError';
  reason: 'too_large' | 'analysis_failed' | 'timeout' | 'encoding_error' | 'binary' | 'syntax_error' | 'general';
  filename?: string; // エラーが発生したファイル（全ファイル失敗時はundefined）
  message: string;
  details?: string; // 追加の詳細情報
  fileSize?: number; // too_largeの場合のファイルサイズ
  maxSize?: number; // too_largeの場合の制限サイズ
  timeoutSeconds?: number; // timeoutの場合のタイムアウト時間
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
  | CacheError
  | ComplexityAnalysisError;

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
  if (options?.filename) {
    error.filename = options.filename;
  }
  if (options?.details) {
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

/**
 * Checks if an unknown error is a ComplexityAnalysisError
 * @param e - Unknown error to check
 * @returns True if the error is a ComplexityAnalysisError
 */
export function isComplexityAnalysisError(e: unknown): e is ComplexityAnalysisError {
  return !!e && typeof e === 'object' && 'type' in e && e.type === 'ComplexityAnalysisError';
}

// Re-export from neverthrow for convenience
export type { Err, Ok } from 'neverthrow';
export { err, errAsync, ok, okAsync, Result, ResultAsync } from 'neverthrow';
