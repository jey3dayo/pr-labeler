/**
 * Error factory functions for creating typed error objects with i18n support
 */

import { t } from '../i18n.js';
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
// Helper Functions
// ============================================================================

/**
 * Helper function to conditionally add an optional field to an error object
 * Reduces code duplication for error factories with optional fields
 */
function withOptionalField<T extends object, K extends keyof T>(base: T, key: K, value: T[K] | undefined): T {
  if (value !== undefined) {
    base[key] = value;
  }
  return base;
}

// ============================================================================
// Core Error Factories
// ============================================================================

/**
 * ファイル分析エラーを作成
 *
 * @param file - エラーが発生したファイルパス
 * @param customMessage - カスタムエラーメッセージ(オプション、後方互換性のため)
 * @returns FileAnalysisError
 */
export const createFileAnalysisError = (file: string, customMessage?: string): FileAnalysisError => ({
  type: 'FileAnalysisError',
  file,
  message: customMessage || t('errors', 'analysis.fileAnalysisError', { file }),
});

/**
 * GitHub APIエラーを作成
 *
 * @param message - 詳細なエラーメッセージ
 * @param status - HTTPステータスコード(オプション)
 * @returns GitHubAPIError
 */
export const createGitHubAPIError = (message: string, status?: number): GitHubAPIError => {
  const translatedMessage = t('errors', 'github.apiError', { message });
  const error: GitHubAPIError = { type: 'GitHubAPIError', message: translatedMessage };
  return withOptionalField(error, 'status', status);
};

/**
 * 設定エラーを作成
 *
 * @param field - エラーが発生した設定フィールド
 * @param value - 無効な値
 * @param customMessage - カスタムエラーメッセージ(オプション、後方互換性のため)
 * @returns ConfigurationError
 */
export const createConfigurationError = (
  field: string,
  value: unknown,
  customMessage?: string,
): ConfigurationError => ({
  type: 'ConfigurationError',
  field,
  value,
  message: customMessage || t('errors', 'configuration.invalidField', { field }),
});

/**
 * パースエラーを作成
 *
 * @param input - パースに失敗した入力
 * @param customMessage - カスタムエラーメッセージ(オプション、後方互換性のため)
 * @returns ParseError
 */
export const createParseError = (input: string, customMessage?: string): ParseError => ({
  type: 'ParseError',
  input,
  message: customMessage || t('errors', 'parsing.invalidFormat', { input }),
});

/**
 * ファイルシステムエラーを作成
 *
 * @param path - エラーが発生したファイルパス
 * @param operation - 実行しようとした操作（'read' | 'write' | 'notFound' | 'permission'）
 * @param customMessage - カスタムエラーメッセージ(オプション、後方互換性のため)
 * @returns FileSystemError
 */
export const createFileSystemError = (
  path: string,
  operation?: 'read' | 'write' | 'notFound' | 'permission',
  customMessage?: string,
): FileSystemError => {
  let message: string;
  if (customMessage) {
    message = customMessage;
  } else if (operation) {
    const keyMap = {
      read: 'fileSystem.readError',
      write: 'fileSystem.writeError',
      notFound: 'fileSystem.fileNotFound',
      permission: 'fileSystem.permissionDenied',
    } as const;
    message = t('errors', keyMap[operation], { path });
  } else {
    message = t('errors', 'fileSystem.readError', { path });
  }

  return { type: 'FileSystemError', message, path };
};

/**
 * 違反エラーを作成
 *
 * @param violations - 違反情報
 * @param customMessage - カスタムエラーメッセージ(オプション、後方互換性のため)
 * @returns ViolationError
 */
export const createViolationError = (violations: Violations, customMessage?: string): ViolationError => ({
  type: 'ViolationError',
  violations,
  message: customMessage || t('errors', 'violation.prSizeExceeded'),
});

/**
 * Diff取得エラーを作成
 *
 * @param source - エラーソース
 * @param details - 詳細なエラー情報
 * @param customMessage - カスタムエラーメッセージ(オプション、後方互換性のため)
 * @returns DiffError
 */
export const createDiffError = (
  source: 'local-git' | 'github-api' | 'both',
  details?: string,
  customMessage?: string,
): DiffError => ({
  type: 'DiffError',
  source,
  message: customMessage || t('errors', 'analysis.diffError', { message: details || 'unknown error' }),
});

/**
 * パターンエラーを作成
 *
 * @param pattern - エラーが発生したパターン
 * @param customMessage - カスタムエラーメッセージ(オプション、後方互換性のため)
 * @returns PatternError
 */
export const createPatternError = (pattern: string, customMessage?: string): PatternError => ({
  type: 'PatternError',
  pattern,
  message: customMessage || t('errors', 'pattern.invalidPattern', { pattern }),
});

/**
 * キャッシュエラーを作成
 *
 * @param key - キャッシュキー(オプション)
 * @param details - 詳細なエラー情報(オプション)
 * @param customMessage - カスタムエラーメッセージ(オプション、後方互換性のため)
 * @returns CacheError
 */
export const createCacheError = (key?: string, details?: string, customMessage?: string): CacheError => {
  const message = customMessage || t('errors', 'analysis.cacheError', { message: details || 'cache operation failed' });
  const error: CacheError = { type: 'CacheError', message };
  return withOptionalField(error, 'key', key);
};

/**
 * 複雑度分析エラーを作成
 *
 * @param reason - エラー理由
 * @param options - 詳細情報(オプション)
 * @param customMessage - カスタムエラーメッセージ(オプション、後方互換性のため)
 * @returns ComplexityAnalysisError
 */
export const createComplexityAnalysisError = (
  reason: ComplexityAnalysisError['reason'],
  options?: Partial<Pick<ComplexityAnalysisError, 'filename' | 'details' | 'fileSize' | 'maxSize' | 'timeoutSeconds'>>,
  customMessage?: string,
): ComplexityAnalysisError => {
  const message =
    customMessage || t('errors', 'analysis.complexityAnalysisError', { message: options?.details || reason });

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

/**
 * 権限エラーを作成
 *
 * @param required - 必要な権限
 * @param customMessage - カスタムエラーメッセージ(オプション、後方互換性のため)
 * @returns PermissionError
 */
export const createPermissionError = (required: string, customMessage?: string): PermissionError => ({
  type: 'PermissionError',
  required,
  message: customMessage || t('errors', 'github.permissionDenied', { operation: required }),
});

/**
 * レート制限エラーを作成
 *
 * @param retryAfter - 再試行までの秒数(オプション)
 * @param customMessage - カスタムエラーメッセージ(オプション、後方互換性のため)
 * @returns RateLimitError
 */
export const createRateLimitError = (retryAfter?: number, customMessage?: string): RateLimitError => {
  const resetTime = retryAfter ? new Date(Date.now() + retryAfter * 1000).toISOString() : 'unknown';
  const message = customMessage || t('errors', 'github.rateLimitExceeded', { resetTime });
  const error: RateLimitError = { type: 'RateLimitError', message };
  return withOptionalField(error, 'retryAfter', retryAfter);
};

/**
 * 予期しないエラーを作成
 *
 * @param originalError - 元のエラー(オプション)
 * @param customMessage - カスタムエラーメッセージ(オプション、後方互換性のため)
 * @returns UnexpectedError
 */
export const createUnexpectedError = (originalError?: unknown, customMessage?: string): UnexpectedError => {
  const details = originalError instanceof Error ? originalError.message : String(originalError || 'unknown error');
  const message = customMessage || `Unexpected error occurred: ${details}`;
  const error: UnexpectedError = { type: 'UnexpectedError', message };
  return withOptionalField(error, 'originalError', originalError);
};
