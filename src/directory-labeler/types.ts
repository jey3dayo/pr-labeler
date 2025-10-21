/**
 * Directory-Based Labeler: 型定義
 *
 * PRの変更ファイルのディレクトリパスに基づいて、自動的にGitHubラベルを付与する機能の型定義。
 */

import { DEFAULT_EXCLUDES, DEFAULT_NAMESPACES, DEFAULT_OPTIONS } from '../configs/directory-labeler-defaults.js';

// Re-export for backward compatibility
export { DEFAULT_EXCLUDES, DEFAULT_NAMESPACES, DEFAULT_OPTIONS };

/**
 * minimatchオプションの型定義
 */
export interface MinimatchOptions {
  /** 隠しファイル/ディレクトリ（`.github`等）をマッチ対象に含める */
  dot?: boolean;
  /** 大文字小文字を区別しない */
  nocase?: boolean;
  /** ベース名のみマッチを有効にする */
  matchBase?: boolean;
}

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
 * 名前空間ポリシーの型定義
 */
export interface NamespacePolicy {
  /** 相互排他（置換）名前空間のリスト */
  exclusive: string[];
  /** 加法的（追加）名前空間のリスト */
  additive: string[];
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
