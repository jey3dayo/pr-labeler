/**
 * Directory-Based Labeler: パターンマッチャー
 *
 * globパターンマッチング、パス正規化、優先順位決定を担当
 */

import { minimatch } from 'minimatch';

import type { MinimatchOptions } from './types.js';
import { INTERNAL_PATH_SEPARATOR } from './types.js';

/**
 * コンパイル済みパターンの型定義
 */
export interface CompiledPattern {
  /** 元のパターン文字列 */
  pattern: string;
  /** マッチャー関数 */
  matcher: (path: string) => boolean;
  /** 優先度（省略可、大きいほど優先） */
  priority?: number;
}

/**
 * パターンマッチング結果の型定義
 */
export interface MatchResult {
  /** マッチしたかどうか */
  matched: boolean;
  /** マッチしたパターン（マッチしなかった場合はundefined） */
  matchedPattern?: string;
  /** マッチ長（最長マッチ優先順位決定用） */
  matchLength?: number;
  /** 優先度（決定に使用） */
  priority?: number;
}

/**
 * ファイルパスを正規化する
 *
 * OS差異を吸収し、POSIXスタイル（`/`区切り）に統一する
 *
 * @param path - 正規化するパス
 * @returns 正規化されたパス
 */
export function normalizePath(path: string): string {
  // バックスラッシュをスラッシュに変換（Windows対応）
  let normalized = path.replace(/\\/g, INTERNAL_PATH_SEPARATOR);

  // 先頭の "./" を削除
  if (normalized.startsWith('./')) {
    normalized = normalized.slice(2);
  }

  return normalized;
}

/**
 * globパターンをコンパイルして再利用可能なマッチャーを生成
 *
 * @param patterns - globパターンの配列
 * @param options - minimatchオプション（部分指定可、未指定の項目はデフォルト値が適用される）
 * @param priority - 優先度（省略可）
 * @returns コンパイル済みパターンの配列
 */
export function compilePatterns(patterns: string[], options: MinimatchOptions, priority?: number): CompiledPattern[] {
  // デフォルト値の適用
  const minimatchOptions = {
    dot: options.dot ?? true,
    nocase: options.nocase ?? false,
    matchBase: options.matchBase ?? false,
    windowsPathsNoEscape: true, // Windowsパス対応
  };

  return patterns.map(pattern => {
    const normalizedPattern = normalizePath(pattern);

    const compiled: CompiledPattern = {
      pattern: normalizedPattern,
      matcher: (path: string) => {
        const normalizedPath = normalizePath(path);
        return minimatch(normalizedPath, normalizedPattern, minimatchOptions);
      },
    };

    // priorityが指定されている場合のみ追加
    if (priority !== undefined) {
      compiled.priority = priority;
    }

    return compiled;
  });
}

/**
 * includeパターンにマッチするか判定し、マッチした場合はパターン情報を返す
 *
 * 優先順位決定アルゴリズム:
 * 1. 除外パターンにマッチすれば短絡評価で不採用
 * 2. includeパターンにマッチする候補を収集
 * 3. 明示的`priority`の降順でソート
 * 4. 同一`priority`の場合、最長マッチ長の降順でソート
 * 5. なお同一の場合、配列内の定義順（最初のマッチ）で決定
 *
 * @param filePath - 判定対象のファイルパス
 * @param includePatterns - includeパターン（コンパイル済み）
 * @param excludePatterns - excludeパターン（コンパイル済み）
 * @returns マッチング結果
 */
export function matchIncludePatterns(
  filePath: string,
  includePatterns: CompiledPattern[],
  excludePatterns: CompiledPattern[],
): MatchResult {
  const normalizedPath = normalizePath(filePath);

  // ステップ1: 除外パターン短絡評価
  for (const excludePattern of excludePatterns) {
    if (excludePattern.matcher(normalizedPath)) {
      return { matched: false };
    }
  }

  // ステップ2: includeパターンにマッチする候補を収集
  const matches: Array<{
    pattern: string;
    matchLength: number;
    priority: number;
    index: number;
  }> = [];

  for (let i = 0; i < includePatterns.length; i++) {
    const includePattern = includePatterns[i];
    if (!includePattern) {
      continue;
    }

    if (includePattern.matcher(normalizedPath)) {
      // マッチ長の計算: パターンの具体性を示す指標
      // より具体的なパターン（長いパターン）を優先
      const matchLength = calculateMatchLength(includePattern.pattern, normalizedPath);

      matches.push({
        pattern: includePattern.pattern,
        matchLength,
        priority: includePattern.priority ?? 0, // 未指定は0として扱う
        index: i, // 定義順のタイブレーク用
      });
    }
  }

  // ステップ3-5: 優先順位ソート
  if (matches.length === 0) {
    return { matched: false };
  }

  // ソート: priority降順 → matchLength降順 → index昇順（定義順）
  matches.sort((a, b) => {
    // priority降順
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }

    // matchLength降順
    if (a.matchLength !== b.matchLength) {
      return b.matchLength - a.matchLength;
    }

    // index昇順（定義順）
    return a.index - b.index;
  });

  const bestMatch = matches[0];
  if (!bestMatch) {
    return { matched: false };
  }

  return {
    matched: true,
    matchedPattern: bestMatch.pattern,
    matchLength: bestMatch.matchLength,
    priority: bestMatch.priority,
  };
}

/**
 * マッチ長を計算する
 *
 * パターンの具体性を示す指標。より具体的なパターンほど高い値を返す。
 *
 * 現在の実装: パターン文字列の長さ
 * （将来的には、ワイルドカードの数や深さなどを考慮した高度な計算も可能）
 *
 * @param pattern - globパターン
 * @param _path - マッチしたパス（将来の拡張用、現在は未使用）
 * @returns マッチ長
 */
function calculateMatchLength(pattern: string, _path: string): number {
  // シンプルな実装: パターンの長さ
  // より具体的（長い）パターンほど優先される
  return pattern.length;
}
