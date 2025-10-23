/**
 * Directory-Based Labeler types
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
 * 名前空間ポリシーの型定義
 */
export interface NamespacePolicy {
  /** 相互排他（置換）名前空間のリスト */
  exclusive: string[];
  /** 加法的（追加）名前空間のリスト */
  additive: string[];
}
