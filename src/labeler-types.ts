/**
 * Type definitions for PR Labeler functionality
 * These types support intelligent label assignment based on PR metrics
 */

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Complete labeler configuration
 */
export interface LabelerConfig {
  size: SizeConfig;
  complexity: ComplexityConfig;
  categories: CategoryConfig[];
  risk: RiskConfig;
  exclude: ExcludeConfig;
  labels: LabelPolicyConfig;
  runtime: RuntimeConfig;
}

/**
 * Size-based labeling configuration
 */
export interface SizeConfig {
  thresholds: {
    small: number; // additions上限（例: 100）
    medium: number; // additions上限（例: 500）
    large: number; // additions上限（例: 1000）
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
  extensions: string[]; // 対象拡張子（例: [".ts", ".tsx"]）
}

/**
 * Category-based labeling configuration
 */
export interface CategoryConfig {
  label: string; // ラベル名（例: "category/tests"）
  patterns: string[]; // minimatchパターン（例: ["__tests__/**", "**/*.test.ts"]）
}

/**
 * Risk-based labeling configuration
 */
export interface RiskConfig {
  high_if_no_tests_for_core: boolean;
  core_paths: string[]; // コア機能パス（例: ["src/**"]）
  coverage_threshold?: number; // カバレッジ閾値（例: 80）
  config_files: string[]; // 設定ファイルパターン（例: [".github/workflows/**"]）
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

// ============================================================================
// Metrics Types
// ============================================================================

/**
 * Complexity metrics for PR
 */
export interface ComplexityMetrics {
  maxComplexity: number; // PR全体の最大複雑度
  filesAnalyzed: FileComplexity[]; // ファイル単位の複雑度
  filesSkipped: string[]; // 非対象拡張子やエラーでスキップされたファイル
}

/**
 * Complexity metrics for a single file
 */
export interface FileComplexity {
  filename: string;
  complexity: number; // ファイルの循環的複雑度
  functions: FunctionComplexity[]; // 関数単位の複雑度（デバッグ用）
}

/**
 * Complexity metrics for a single function
 */
export interface FunctionComplexity {
  name: string;
  line: number;
  complexity: number;
}

/**
 * PR metrics including file metrics and complexity
 */
export interface PRMetrics {
  totalAdditions: number;
  files: FileMetrics[];
  complexity?: ComplexityMetrics; // 複雑度分析が無効の場合はundefined
}

/**
 * File metrics (reused from existing types)
 */
export interface FileMetrics {
  filename: string;
  size: number;
  lines: number;
  additions: number;
  deletions: number;
}

// ============================================================================
// Label Decision Types
// ============================================================================

/**
 * Label decisions for a PR
 */
export interface LabelDecisions {
  labelsToAdd: string[]; // 付与すべきラベル
  labelsToRemove: string[]; // 削除すべきラベル（置換ポリシー適用時）
  reasoning: LabelReasoning[]; // デバッグ用の判定理由
}

/**
 * Reasoning for a label decision
 */
export interface LabelReasoning {
  label: string;
  reason: string; // 例: "additions (1234) exceeds large threshold (1000)"
  category: 'size' | 'complexity' | 'category' | 'risk';
}

/**
 * Result of label update operation
 */
export interface LabelUpdate {
  added: string[]; // 追加されたラベル
  removed: string[]; // 削除されたラベル
  skipped: string[]; // スキップされたラベル（権限不足等）
  apiCalls: number; // 実行されたAPI呼び出し数
}

// ============================================================================
// Default Configurations
// ============================================================================

/**
 * Default labeler configuration
 */
export const DEFAULT_LABELER_CONFIG: LabelerConfig = {
  size: {
    thresholds: {
      small: 100,
      medium: 500,
      large: 1000,
    },
  },
  complexity: {
    enabled: true,
    metric: 'cyclomatic',
    thresholds: {
      medium: 10,
      high: 20,
    },
    extensions: ['.ts', '.tsx'],
  },
  categories: [
    {
      label: 'category/tests',
      patterns: ['__tests__/**', '**/*.test.ts', '**/*.test.tsx'],
    },
    {
      label: 'category/ci-cd',
      patterns: ['.github/workflows/**'],
    },
    {
      label: 'category/documentation',
      patterns: ['docs/**', '**/*.md'],
    },
    {
      label: 'category/components',
      patterns: ['src/components/**'],
    },
  ],
  risk: {
    high_if_no_tests_for_core: true,
    core_paths: ['src/**'],
    config_files: ['.github/workflows/**', 'package.json', 'tsconfig.json'],
  },
  exclude: {
    additional: [],
  },
  labels: {
    create_missing: true,
    namespace_policies: {
      'size/*': 'replace',
      'category/*': 'additive',
      'complexity/*': 'replace',
      'risk/*': 'replace',
    },
  },
  runtime: {
    fail_on_error: false,
    dry_run: false,
  },
};
