/**
 * Directory-Based Labeler: 型定義とデフォルト設定
 *
 * PRの変更ファイルのディレクトリパスに基づいて、自動的にGitHubラベルを付与する機能の型定義。
 */

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
 * デフォルトのminimatchオプション
 */
export const DEFAULT_OPTIONS: Required<MinimatchOptions> = {
  dot: true,
  nocase: false,
  matchBase: false,
} as const;

/**
 * デフォルトの名前空間ポリシー
 */
export const DEFAULT_NAMESPACES: Required<NamespacePolicy> = {
  exclusive: ['size', 'area', 'type'],
  additive: ['scope', 'meta'],
} as const;

/**
 * デフォルトの除外パターン
 *
 * これらのパターンは、Pattern Matcherレベルで共通適用され、
 * ユーザー設定の除外パターンと論理和で組み合わせられます。
 */
export const DEFAULT_EXCLUDES: readonly string[] = [
  '.vscode/**',
  '.idea/**',
  '.husky/**',
  'node_modules/**',
  '.git/**',
  '**/*.lock',
  '**/package-lock.json',
  '**/pnpm-lock.yaml',
  '**/yarn.lock',
  '**/composer.lock',
  '**/Gemfile.lock',
  '**/Cargo.lock',
  '**/poetry.lock',
  '**/Pipfile.lock',
  '**/.DS_Store',
  '**/Thumbs.db',
] as const;

/**
 * 内部実装定数: パス区切り文字
 *
 * すべてのパスはPOSIXスタイル（`/`区切り）に正規化されます。
 * この定数はユーザー設定不可で、内部実装でのみ使用されます。
 */
export const INTERNAL_PATH_SEPARATOR = '/' as const;
