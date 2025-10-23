/**
 * Directory-Based Labeler: 型定義
 *
 * PRの変更ファイルのディレクトリパスに基づいて、自動的にGitHubラベルを付与する機能の型定義。
 */

import { DEFAULT_EXCLUDES, DEFAULT_NAMESPACES, DEFAULT_OPTIONS } from '../configs/directory-labeler-defaults.js';
import type { MinimatchOptions, NamespacePolicy } from '../types/directory-labeler.js';

// Re-export for backward compatibility
export { DEFAULT_EXCLUDES, DEFAULT_NAMESPACES, DEFAULT_OPTIONS };
export type { MinimatchOptions, NamespacePolicy };

/**
 * ラベルマッピングルールの型定義
 */
export interface LabelRule {
  /** ラベル名（必須） */
  label: string;
  /** includeパターン（必須、非空） */
  include: string[];
  /** excludeパターン（省略可） */
  exclude?: string[];
  /** 優先度（省略可、大きいほど優先） */
  priority?: number;
}

/**
 * Directory-Based Labeler設定の型定義
 */
export interface DirectoryLabelerConfig {
  /** スキーマバージョン（必須、現在は1のみ） */
  version: 1;
  /** minimatchオプション（省略可） */
  options?: MinimatchOptions;
  /** ラベルマッピングルール（必須、配列） */
  rules: LabelRule[];
  /** 名前空間ポリシー（省略可） */
  namespaces?: NamespacePolicy;
  /** デフォルト除外パターンを使用するか（省略可、デフォルト: true） */
  useDefaultExcludes?: boolean;
}

/**
 * 内部実装定数: パス区切り文字
 *
 * すべてのパスはPOSIXスタイル（`/`区切り）に正規化されます。
 * この定数はユーザー設定不可で、内部実装でのみ使用されます。
 */
export const INTERNAL_PATH_SEPARATOR = '/' as const;
