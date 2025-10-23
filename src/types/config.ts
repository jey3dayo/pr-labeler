/**
 * Configuration types shared across modules
 */

/**
 * Multi-language display name
 */
export interface DisplayName {
  en: string;
  ja: string;
}

/**
 * Category-based labeling configuration
 */
export interface CategoryConfig {
  label: string; // ラベル名（例: "category/tests"）
  patterns: string[]; // minimatchパターン（例: ["__tests__/**", "**/*.test.ts"]）
  exclude?: string[]; // 除外パターン（例: [".kiro/**"]）
  display_name?: DisplayName; // 多言語表示名（オプション）
}

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
 * Category labeling configuration
 */
export interface CategoryLabelingConfig {
  enabled: boolean; // カテゴリラベルの有効化フラグ
}

/**
 * Size-based labeling configuration
 */
export interface SizeConfig {
  enabled: boolean; // サイズラベルの有効化フラグ
  thresholds: {
    small: number; // additions上限（例: 200）
    medium: number; // additions上限（例: 500）
    large: number; // additions上限（例: 1000）
    xlarge: number; // additions上限（例: 3000）
  };
}

/**
 * Complexity-based labeling configuration
 */
export interface ComplexityConfig {
  enabled: boolean;
  metric: 'cyclomatic';
  thresholds: {
    medium: number; // 循環的複雑度閾値（例: 10）
    high: number; // 循環的複雑度閾値（例: 20）
  };
  extensions: string[]; // 対象拡張子（例: [".ts", ".tsx", ".js", ".jsx"]）
  exclude: string[]; // 除外パターン（minimatch形式）
}

/**
 * Risk-based labeling configuration
 */
export interface RiskConfig {
  enabled: boolean; // リスクラベルの有効化フラグ
  high_if_no_tests_for_core: boolean;
  core_paths: string[]; // コア機能パス（例: ["src/**"]）
  coverage_threshold?: number; // カバレッジ閾値（例: 80）
  config_files: string[]; // 設定ファイルパターン（例: [".github/workflows/**"]）
  use_ci_status?: boolean; // CI結果を考慮するかどうか（デフォルト: true）
}

/**
 * Exclude pattern configuration
 */
export interface ExcludeConfig {
  additional: string[]; // 追加除外パターン（例: ["dist/**", "*.d.ts"]）
}

/**
 * Label policy configuration
 */
export interface LabelPolicyConfig {
  create_missing: boolean;
  namespace_policies: Record<string, 'replace' | 'additive'>; // 例: {"size/*": "replace"}
}

/**
 * Runtime configuration
 */
export interface RuntimeConfig {
  fail_on_error: boolean;
  dry_run: boolean;
}

/**
 * Complete labeler configuration
 */
export interface LabelerConfig {
  language?: string; // 言語選択（ロケール形式 'ja-JP', 'en-US' も許容、正規化フローで LanguageCode に収束）
  size: SizeConfig;
  complexity: ComplexityConfig;
  categoryLabeling: CategoryLabelingConfig;
  categories: CategoryConfig[];
  risk: RiskConfig;
  exclude: ExcludeConfig;
  labels: LabelPolicyConfig;
  runtime: RuntimeConfig;
}
