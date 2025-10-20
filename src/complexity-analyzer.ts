/**
 * Complexity Analyzer for PR files
 * Uses ESLint standard complexity rule (not eslintcc)
 */

import * as core from '@actions/core';
import type { Linter } from 'eslint';
import { ESLint } from 'eslint';
import { promises as fs } from 'fs';
import { ResultAsync } from 'neverthrow';
import * as path from 'path';

import { type ComplexityAnalysisError, createComplexityAnalysisError } from './errors.js';
import type { ComplexityMetrics, FileComplexity, FunctionComplexity, SkippedFile } from './labeler-types.js';

/**
 * Analysis options for complexity calculation
 */
export interface AnalysisOptions {
  concurrency?: number; // 並列度（デフォルト: 8、最大: 8）
  timeout?: number; // 全体タイムアウト（秒、デフォルト: 60）
  fileTimeout?: number; // 個別ファイルタイムアウト（秒、デフォルト: 5）
  maxFileSize?: number; // 最大ファイルサイズ（バイト、デフォルト: 1MB）
  extensions?: string[]; // 対象拡張子（デフォルト: ['.ts', '.tsx', '.js', '.jsx']）
  exclude?: string[]; // 除外パターン
}

/**
 * Default analysis options
 */
export const DEFAULT_ANALYSIS_OPTIONS: Required<AnalysisOptions> = {
  concurrency: 8,
  timeout: 60,
  fileTimeout: 5,
  maxFileSize: 1024 * 1024, // 1MB
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  exclude: [
    '**/dist/**',
    '**/build/**',
    '**/node_modules/**',
    '**/vendor/**',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
    '**/*.generated.ts',
    '**/__generated__/**',
  ],
};

/**
 * Check if tsconfig.json exists in the project root
 * @returns True if tsconfig.json exists
 */
async function hasTsconfigJson(): Promise<boolean> {
  try {
    const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
    await fs.access(tsconfigPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create ESLint instance with complexity rule enabled
 * @param hasTsconfig - Whether tsconfig.json exists
 * @returns Configured ESLint instance
 */
async function createESLintInstance(hasTsconfig: boolean): Promise<ESLint> {
  // Dynamic import for @typescript-eslint/parser
  const typescriptParser = await import('@typescript-eslint/parser');

  return new ESLint({
    overrideConfigFile: true,
    baseConfig: {
      files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
      languageOptions: {
        parser: typescriptParser.default,
        parserOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
          ...(hasTsconfig && { tsconfigRootDir: process.cwd() }),
          ecmaFeatures: {
            jsx: true,
          },
        },
      },
      rules: {
        complexity: ['error', 0], // Report all functions (threshold 0)
      },
    },
  });
}

/**
 * Parse complexity from ESLint message
 * Message format: "Function 'functionName' has a complexity of 5. Maximum allowed is 0."
 *
 * @param message - ESLint message object
 * @returns Parsed function complexity or null
 */
function parseComplexityMessage(message: Linter.LintMessage): FunctionComplexity | null {
  // Pattern: "Function 'name' has a complexity of N."
  const pattern = /Function '(.+)' has a complexity of (\d+)\./;
  const match = message.message.match(pattern);

  if (!match || !match[1] || !match[2]) {
    core.debug(`Failed to parse complexity message: ${message.message}`);
    return null;
  }

  return {
    name: match[1],
    complexity: parseInt(match[2], 10),
    loc: {
      start: message.line || 1,
      end: message.endLine || message.line || 1,
    },
  };
}

/**
 * Check if error is a syntax error
 * @param messages - ESLint messages
 * @returns True if syntax error found
 */
function hasSyntaxError(messages: Linter.LintMessage[]): boolean {
  return messages.some(m => m.fatal === true || m.message.toLowerCase().includes('parsing error'));
}

/**
 * Complexity Analyzer Service
 * Calculates cyclomatic complexity for TypeScript/JavaScript files using ESLint
 *
 * Note: This uses class syntax for better organization of related methods.
 * Class syntax is restricted elsewhere in the codebase, but allowed here for this specific use case.
 */
// eslint-disable-next-line no-restricted-syntax
export class ComplexityAnalyzer {
  /**
   * Analyze a single file for complexity
   * @param filePath - Repository-relative file path
   * @param options - Analysis options
   * @returns File complexity or error
   */
  analyzeFile(
    filePath: string,
    options?: Partial<AnalysisOptions>,
  ): ResultAsync<FileComplexity, ComplexityAnalysisError> {
    const opts = { ...DEFAULT_ANALYSIS_OPTIONS, ...options };

    return ResultAsync.fromPromise(
      (async () => {
        // 1. Check file size (before reading content)
        try {
          const stats = await fs.stat(filePath);
          if (stats.size > opts.maxFileSize) {
            throw createComplexityAnalysisError(
              'too_large',
              `File ${filePath} exceeds max size (${stats.size} > ${opts.maxFileSize})`,
              {
                filename: filePath,
                fileSize: stats.size,
                maxSize: opts.maxFileSize,
              },
            );
          }
        } catch (error) {
          if (error && typeof error === 'object' && 'reason' in error) {
            // Re-throw ComplexityAnalysisError
            throw error;
          }
          throw createComplexityAnalysisError('analysis_failed', `Failed to stat file ${filePath}`, {
            filename: filePath,
            details: error instanceof Error ? error.message : String(error),
          });
        }

        // 2. Run ESLint complexity rule
        const hasTsconfig = await hasTsconfigJson();
        if (!hasTsconfig) {
          core.warning('tsconfig.json not found. Using default parser options for complexity analysis.');
        }

        const eslint = await createESLintInstance(hasTsconfig);

        const results = await eslint.lintFiles([filePath]);

        if (!results || results.length === 0) {
          throw createComplexityAnalysisError('analysis_failed', `No ESLint results for ${filePath}`, {
            filename: filePath,
          });
        }

        const result = results[0];
        if (!result) {
          throw createComplexityAnalysisError('analysis_failed', `Empty ESLint result for ${filePath}`, {
            filename: filePath,
          });
        }

        // Check for syntax errors
        const syntaxError = hasSyntaxError(result.messages);
        if (syntaxError) {
          core.debug(`Syntax error in ${filePath}, treating as complexity 0`);
          return {
            path: filePath,
            complexity: 0,
            functions: [],
            isSyntaxError: true,
          };
        }

        // Parse complexity from messages
        const functions = result.messages
          .filter(m => m.ruleId === 'complexity')
          .map(parseComplexityMessage)
          .filter((f): f is FunctionComplexity => f !== null);

        // Calculate total file complexity (sum of all functions)
        const totalComplexity = functions.reduce((sum, f) => sum + f.complexity, 0);

        return {
          path: filePath,
          complexity: totalComplexity,
          functions,
          isSyntaxError: false,
        };
      })(),
      (error): ComplexityAnalysisError => {
        // Error is already a ComplexityAnalysisError
        if (error && typeof error === 'object' && 'reason' in error) {
          return error as ComplexityAnalysisError;
        }

        // Convert unknown errors
        return createComplexityAnalysisError('analysis_failed', `Failed to analyze ${filePath}`, {
          filename: filePath,
          details: error instanceof Error ? error.message : String(error),
        });
      },
    );
  }

  /**
   * Analyze multiple files in parallel and aggregate metrics
   * @param filePaths - List of file paths to analyze
   * @param options - Analysis options
   * @returns PR-wide complexity metrics or error
   */
  analyzeFiles(
    filePaths: string[],
    options?: Partial<AnalysisOptions>,
  ): ResultAsync<ComplexityMetrics, ComplexityAnalysisError> {
    const opts = { ...DEFAULT_ANALYSIS_OPTIONS, ...options };
    const startTime = Date.now();

    return ResultAsync.fromPromise(
      (async () => {
        const successful: FileComplexity[] = [];
        const skippedFiles: SkippedFile[] = [];

        // p-limitで並列度制御（dynamic import for ESM module）
        const pLimit = (await import('p-limit')).default;
        const concurrency = Math.min(opts.concurrency, 8);
        const limit = pLimit(concurrency);

        core.info(`Analyzing ${filePaths.length} files with concurrency ${concurrency}`);

        // 各ファイルの解析を並列実行
        const promises = filePaths.map(filePath =>
          limit(async () => {
            const result = await this.analyzeFile(filePath, opts);

            if (result.isOk()) {
              return { status: 'fulfilled' as const, value: result.value };
            } else {
              return {
                status: 'rejected' as const,
                reason: result.error,
              };
            }
          }),
        );

        const results = await Promise.all(promises);

        // 成功/失敗を分類
        for (const result of results) {
          if (result.status === 'fulfilled') {
            successful.push(result.value);
          } else {
            const error = result.reason;
            const skipped: SkippedFile = {
              path: error.filename || 'unknown',
              reason: error.reason,
            };
            if (error.details) {
              skipped.details = error.details;
            }
            skippedFiles.push(skipped);
          }
        }

        // 実行時間測定
        const elapsedTime = Date.now() - startTime;
        core.info(`Complexity analysis completed: ${successful.length} files, ${elapsedTime}ms`);

        if (elapsedTime > 10000) {
          core.warning(`Complexity analysis took ${elapsedTime}ms (target: <5000ms for 100 files)`);
        }

        // 集計
        const baseMetrics = aggregateMetrics(successful);

        if (!baseMetrics) {
          throw createComplexityAnalysisError('general', 'No files could be analyzed', {
            details: `Analyzed: ${successful.length}, Skipped: ${skippedFiles.length}`,
          });
        }

        // 完全なComplexityMetricsを構築
        const hasTsconfig = await hasTsconfigJson();
        const completeMetrics: ComplexityMetrics = {
          ...baseMetrics,
          skippedFiles,
          truncated: false, // 呼び出し元で設定
          hasTsconfig,
        };

        return completeMetrics;
      })(),
      (error): ComplexityAnalysisError => {
        if (error && typeof error === 'object' && 'reason' in error) {
          return error as ComplexityAnalysisError;
        }
        return createComplexityAnalysisError('general', 'Failed to analyze files', {
          details: error instanceof Error ? error.message : String(error),
        });
      },
    );
  }
}

/**
 * Aggregate complexity metrics from file results
 * @param results - Array of file complexity results
 * @returns Aggregated metrics or undefined if no files
 */
export function aggregateMetrics(
  results: FileComplexity[],
): Omit<ComplexityMetrics, 'skippedFiles' | 'truncated' | 'totalPRFiles' | 'hasTsconfig'> | undefined {
  // 0件の場合は早期リターン（Math.max([])で-Infinity、0除算を回避）
  if (results.length === 0) {
    return undefined;
  }

  // 構文エラーファイル（複雑度0、isSyntaxError: true）を抽出
  const syntaxErrorFiles = results.filter(r => r.isSyntaxError === true).map(r => r.path);

  // 全ファイル（構文エラー含む）を集計対象とする（要件6.3準拠）
  const validFiles = results.filter(r => r.complexity >= 0);

  // validFilesが0件の場合もundefined（全ファイルがスキップされた場合）
  if (validFiles.length === 0) {
    return undefined;
  }

  // 最大複雑度: 全ファイルから最大値を取得
  const maxComplexity = Math.max(...validFiles.map(f => f.complexity));

  // 平均複雑度: 構文エラーファイル（複雑度0）も含めて計算（要件6.3準拠）
  // 小数第1位で四捨五入
  const avgComplexity =
    Math.round((validFiles.reduce((sum, f) => sum + f.complexity, 0) / validFiles.length) * 10) / 10;

  return {
    maxComplexity,
    avgComplexity,
    analyzedFiles: validFiles.length,
    files: validFiles,
    syntaxErrorFiles,
  };
}

/**
 * Create a new ComplexityAnalyzer instance
 */
export function createComplexityAnalyzer(): ComplexityAnalyzer {
  return new ComplexityAnalyzer();
}
