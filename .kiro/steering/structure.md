# Project Structure - PR Insights Labeler

> updated_at: 2025-11-17T02:48:00Z

## Root Directory Organization

```
pr-labeler/
├── .claude/              # Claude Code設定
│   └── commands/         # カスタムスラッシュコマンド
├── .github/              # GitHub設定
│   └── workflows/        # CI/CD定義
├── .kiro/                # Kiro Spec-Driven Development
│   ├── specs/            # 機能仕様書
│   └── steering/         # ステアリングドキュメント（本ファイル群）
├── .serena/              # Serena AI設定
│   ├── memories/         # プロジェクトメモリ（AIナレッジベース）
│   └── project.yml       # Serenaプロジェクト設定
├── __tests__/            # テストファイル
│   └── __snapshots__/    # Vitestスナップショット
├── coverage/             # テストカバレッジレポート（git ignore）
├── dist/                 # ビルド成果物（バージョン管理対象）
├── docs/                 # プロジェクトドキュメント
├── node_modules/         # 依存関係（git ignore）
├── src/                  # ソースコード
│   └── parsers/          # パーサーモジュール
├── action.yml            # GitHub Action定義
├── package.json          # Node.js設定
├── pnpm-lock.yaml        # pnpm依存関係ロック
├── tsconfig.json         # TypeScript設定
├── eslint.config.js      # ESLint v9設定（Flat Config）
├── prettier.config.js    # Prettier設定
├── vitest.config.ts      # Vitest設定
├── mise.toml             # タスクランナー設定
├── .editorconfig         # エディタ設定
├── .gitignore            # Git除外設定
├── .gitattributes        # Git属性設定
├── AGENTS.md             # AIエージェント開発ガイド
├── CLAUDE.md             # プロジェクトガイド（Claude Code用）
├── CHANGELOG.md          # 変更履歴
├── LICENSE               # MITライセンス
└── README.md             # プロジェクトREADME
```

### Root Additions (2024)

- `README.ja.md`: 日本語版 README。英語版と同じ更新タイミングで同期させる
- `_documentation-quality-report.md`: ドキュメント関連CIが生成するレポート。レビュー時の参照用で追跡は不要
- `scripts/`: 補助スクリプト群（i18n型生成など）。pnpm postinstallから呼び出される点に注意
- `knip.json`: 未使用コード検出（knip）の設定ファイル。大規模リファクタ時はこの設定を更新
- `tsconfig.test.json`: Vitest専用のTypeScript設定。テスト環境向け型オプションを分離

## Subdirectory Structures

### `src/` - Source Code

```
src/
├── index.ts                   # エントリーポイント（main関数）
├── types.ts                   # 共通型定義
├── input-mapper.ts            # Actions入力パース・検証（選択的ラベル有効化を含む）
├── input-parser.ts            # 入力値の正規化とパース
├── diff-strategy.ts           # Git差分ベースの分析戦略
├── pattern-matcher.ts         # ファイル除外パターンマッチ
├── label-manager.ts           # GitHubラベル管理
├── comment-manager.ts         # PRコメント管理
├── report-formatter.ts        # Markdownレポート生成
├── actions-io.ts              # GitHub Actions I/O（summary, output）
├── ci-status.ts               # CI実行状態管理
├── labeler-types.ts           # PR Insights Labeler型定義とデフォルト設定
├── config-loader.ts           # YAML設定読み込みとバリデーション（PR Insights Labeler）
├── label-decision-engine.ts   # ラベル判定ロジック（サイズ/複雑度/カテゴリ/リスク）
├── label-applicator.ts        # ラベル適用と冪等性保証
├── complexity-analyzer.ts     # コード複雑度分析（ESLint標準API使用）
├── input/                     # 入力処理モジュール
│   └── input-normalizer.ts    # 入力値の正規化処理
├── parsers/                   # パーサーモジュール
│   └── size-parser.ts         # サイズ文字列パース（"100KB" → バイト数）
├── file-metrics/              # ファイルメトリクス分析モジュール
│   ├── analyze-files.ts       # ファイル分析オーケストレーション
│   ├── binary-detector.ts     # バイナリファイル検出
│   ├── file-size-service.ts   # ファイルサイズ計算
│   ├── line-counter.ts        # 行数カウント
│   └── types.ts               # メトリクス型定義
├── label-decisions/           # ラベル決定ロジックモジュール
│   └── risk-evaluator.ts      # リスク評価ロジック
├── directory-labeler/         # 🆕 Directory-Based Labeling機能
│   ├── config-loader.ts       # directory-labeler.yml設定読み込み
│   ├── decision-engine.ts     # パス→ラベルマッピングと優先順位制御
│   ├── pattern-matcher.ts     # Globパターンマッチングとフィルタリング
│   ├── label-applicator.ts    # 名前空間ポリシーに基づくラベル適用
│   ├── logging.ts             # 構造化ロギング
│   └── types.ts               # Directory Labeler専用型定義
├── errors/                    # 🆕 統一エラーハンドリング
│   ├── types.ts               # エラー型定義
│   ├── factories.ts           # エラーファクトリー関数
│   ├── guards.ts              # 型ガード関数
│   └── index.ts               # エクスポート
└── configs/                   # 🆕 設定管理
    ├── default-config.ts      # デフォルト設定値
    ├── categories.ts          # デフォルトカテゴリ定義
    ├── default-excludes.ts    # デフォルト除外パターン
    ├── directory-labeler-defaults.ts  # Directory Labelerデフォルト設定
    ├── label-defaults.ts      # ラベルデフォルト値定数
    └── index.ts               # エクスポート
```

#### 2024アップデート（`src/`）

- `config/`: GitHub設定取得とYAMLバリデーションを`loaders/`・`transformers/`へ分割し、定義値を持つ`configs/`と役割を明確化
- `config-builder.ts` + `environment-loader.ts`: language設定を含む全入力をマージし、`CompleteConfig`として呼び出し側から参照
- `failure-evaluator.ts`: ラベルベースのワークフロー失敗制御を単機能モジュール化し、workflow/policyから利用
- `size-comparison.ts`: PRサイズカテゴリー計算を共通化し、ラベル決定とFail判定双方で再利用
- `summary/`: Summary出力を`summary-writer.ts`と`formatters/`で責務分割し、翻訳テキストを集中管理
- `workflow/`: `stages/`で初期化→分析→ラベリング→終端処理を段階化。`pipeline.ts`が公開APIとして束ねる
- `types/`: 分野ごとの型（analysis/config/directory-labeler/i18n）を整理。`i18n.d.ts`は自動生成ファイル（scripts/generate-i18n-types.ts）で手編集禁止
- `locales/`: 英語・日本語の翻訳JSON（summary/errors/logs/labels/common）を保持し、nccバンドルに取り込む
- `utils/`: namespace操作・パス整形・GitHubラベル整形などの横断ユーティリティを集約

### `__tests__/` - Test Files

```
__tests__/
├── __snapshots__/                    # Vitestスナップショット
├── index.test.ts                     # メインフロー統合テスト
├── input-mapper.test.ts              # 入力検証テスト（選択的ラベル有効化を含む）
├── file-metrics.test.ts              # メトリクス分析テスト
├── diff-strategy.test.ts             # 差分戦略テスト
├── pattern-matcher.test.ts           # パターンマッチテスト
├── label-manager.test.ts             # ラベル管理テスト
├── comment-manager.test.ts           # コメント管理テスト
├── report-formatter.test.ts          # レポート生成テスト
├── actions-io.test.ts                # Actions I/Oテスト
├── errors.test.ts                    # エラーハンドリングテスト
├── integration.test.ts               # 統合テスト
├── label-decision-engine.test.ts     # ラベル判定ロジックテスト
├── label-applicator.test.ts          # ラベル適用テスト
├── config-loader.test.ts             # 設定読み込みテスト
├── complexity-analyzer.test.ts       # 複雑度分析テスト
├── selective-label-enabling.test.ts  # 🆕 選択的ラベル有効化テスト
├── size-parser.test.ts               # サイズパーサーテスト
├── directory-labeler/                # 🆕 Directory-Based Labelerテスト
│   ├── config-loader.test.ts         # 設定読み込みテスト
│   ├── decision-engine.test.ts       # 判定エンジンテスト
│   ├── pattern-matcher.test.ts       # パターンマッチテスト
│   ├── label-applicator.test.ts      # ラベル適用テスト
│   ├── logging.test.ts               # ロギングテスト
│   └── integration.test.ts           # 統合テスト
└── fixtures/                         # テストフィクスチャー
    ├── complexity-sample.ts          # 複雑度テスト用サンプルコード
    └── syntax-error.ts               # 構文エラーテストケース
```

#### 2024アップデート（`__tests__/`）

- `config-builder.test.ts`・`environment-loader.test.ts`: Config Layerパターンの統合テストを追加、言語優先順位の回帰を防止
- `failure-evaluator.test.ts`・`workflow/`配下: ラベルベース失敗制御とステージ遷移を個別検証
- `i18n.test.ts`・`i18n-integrity.test.ts`・`error-factories-i18n.test.ts`: 翻訳キーと型定義の整合性をチェック
- `summary-writer.test.ts`: Summary出力をformatters単位で検証し、翻訳済み文言の崩れを検出
- `vitest.setup.ts`: テスト共通セットアップ（i18n Resetなど）を定義

テストファイルは対応するソースファイルと1対1でマッピング。

### `.kiro/` - Kiro Spec-Driven Development

```
.kiro/
├── specs/                     # 機能仕様書
│   └── [feature-name]/        # 各機能の仕様
│       ├── spec.json          # メタデータ（ステータス、フェーズ）
│       ├── requirements.md    # 要件定義
│       ├── design.md          # 技術設計
│       └── tasks.md           # 実装タスク
└── steering/                  # ステアリングドキュメント
    ├── product.md             # プロダクト概要
    ├── tech.md                # 技術スタック
    └── structure.md           # プロジェクト構造（本ファイル）
```

Kiroワークフロー: Requirements → Design → Tasks → Implementation

### `.serena/` - Serena AI Memory

```
.serena/
├── memories/                      # プロジェクトメモリ
│   ├── project_overview.md        # プロジェクト概要
│   ├── project_structure.md       # 構造詳細
│   ├── code_style_conventions.md  # コーディング規約
│   ├── neverthrow_patterns.md     # neverthrowパターン
│   ├── suggested_commands.md      # 推奨コマンド
│   └── task_completion_checklist.md # タスク完了チェックリスト
└── project.yml                    # Serenaプロジェクト設定
```

SerenaはMCP（Model Context Protocol）ベースのAI開発支援ツール。

### `docs/` - Documentation

```
docs/
├── ja/API.md                    # API仕様（正典、英語版は未整備）
├── ja/release-process.md        # リリースプロセス
├── ja/documentation-guidelines.md # ドキュメント作成ガイドライン
└── en/*                         # 英語版ドキュメント（一部未整備）
```

#### 2024アップデート（`docs/`）

- `configuration.md`: アクション入力とYAML設定のマッピングを詳細化（Config Layerパターンと揃える）
- `advanced-usage.md`: Directory Labeler・リスク制御など高度機能の運用ガイド
- `i18n-error-migration-guide.md`: 多言語化移行時のエラーメッセージ対応フロー
- `troubleshooting.md`: 典型的な失敗パターンと対応策
- README多言語化に合わせて`README.ja.md`を参照するセクションが追加
- `_review-codex.md`: 旧レビューガイドは削除済み。レビュー基準は`documentation-guidelines.md`に集約

## Code Organization Patterns

### Module Responsibility

各モジュールは単一責任原則に従い、明確な境界を持つ：

**基本モジュール**:

1. **Input Mapper**: 入力検証のみ（ビジネスロジックなし、選択的ラベル有効化を含む）
2. **Input Normalizer** (`input/`): 入力値の正規化と変換
3. **File Metrics** (`file-metrics/`): ファイル分析をサブモジュールに分割（API呼び出しなし）
   - analyze-files: オーケストレーション
   - binary-detector: バイナリ検出
   - file-size-service: サイズ計算
   - line-counter: 行数カウント
4. **Diff Strategy**: Git差分収集のみ（分析ロジックなし）
5. **Pattern Matcher**: パターンマッチのみ（ファイルI/Oなし）
6. **Label Manager**: ラベル操作のみ（メトリクス計算なし）
7. **Comment Manager**: コメント操作のみ（レポート生成は委譲）
8. **Report Formatter**: Markdown生成のみ（GitHub API呼び出しなし）

**PR Insights Labelerモジュール**:

1. **Complexity Analyzer**: コード複雑度分析のみ（ESLint標準API使用）
2. **Label Decision Engine**: メトリクスベースのラベル判定のみ
3. **Label Applicator**: ラベル適用と冪等性保証のみ
4. **Config Loader**: YAML設定読み込みとバリデーションのみ
5. **Risk Evaluator** (`label-decisions/`): リスク評価ロジックの専門化

**Directory-Based Labelerモジュール**:

1. **Directory Config Loader**: directory-labeler.yml読み込みのみ
2. **Directory Decision Engine**: パス→ラベルマッピングと優先順位制御のみ
3. **Directory Pattern Matcher**: Globパターンマッチングのみ
4. **Directory Label Applicator**: 名前空間ポリシーに基づくラベル適用のみ
5. **Directory Logging**: 構造化ロギングのみ

**共通モジュール**:

1. **Error Handling** (`errors/`): 統一されたエラー生成・型ガード・ハンドリング
2. **Configuration** (`configs/`): デフォルト設定値とカテゴリ定義の管理

**Workflow Orchestration（2024）**:

1. **Workflow Stages** (`workflow/stages/`): initialization→analysis→labeling→finalizationをフェーズごとに分離
2. **Workflow Policy** (`workflow/policy/` + `failure-evaluator.ts`): ラベル結果と設定に基づくワークフロー失敗判定
3. **Pipeline Export** (`workflow/pipeline.ts`): ステージの公開APIを一本化し、`index.ts`からの利用を単純化

**Internationalization Stack**:

1. **i18n Core** (`i18n.ts`): i18next初期化と`t`関数提供
2. **Locales** (`locales/{en,ja}/`): summary/errors/logs/labels/commonの翻訳JSON
3. **Types** (`types/i18n.d.ts`): translation resourcesの型（scripts/generate-i18n-types.tsで自動生成）

**Automation Scripts**:

1. **generate-i18n-types** (`scripts/`): 翻訳JSON変更時に型を再生成（postinstallで自動実行）

### Data Flow Pattern

```
Input (GitHub Actions)
  ↓
Input Mapper → Validated Config (選択的ラベル有効化を含む)
  ↓
Diff Strategy → File List
  ↓
Pattern Matcher → Filtered Files
  ↓
File Metrics → Metrics Data
  ↓
┌─────────────┴────────────────────────────────┐
↓                                              ↓
PR Insights Labeler Flow                     Directory-Based Labeler Flow
  ↓                                              ↓
Complexity Analyzer (if enabled)      Directory Config Loader
  ↓                                              ↓
Label Decision Engine                  Decision Engine (priority/matching)
  ↓                                              ↓
Label Applicator (冪等性保証)          Label Applicator (namespace policy)
  ↓                                              ↓
  └──────────────┬───────────────────────────────┘
                 ↓
         Label Manager (GitHub API)
                 ↓
         Report Formatter
                 ↓
         Comment Manager
                 ↓
         GitHub API (comments)
                 ↓
         Actions I/O (summary, outputs)
```

2024年アップデート: 上記フローは`workflow/pipeline.ts`がステージ化して実行。`initializeAction()`で入力→Config Builder→i18n初期化を済ませ、`finalizeAction()`内で`failure-evaluator.ts`とSummary書き込みを一括管理する。

### Error Handling Pattern

neverthrowの`Result<T, E>`型を使用したRailway-Oriented Programming：

```typescript
// 成功パス
const result = await parseInput(inputs)
  .andThen(validateConfig)
  .andThen(analyzeFiles)
  .andThen(applyLabels)
  .andThen(postComment);

// エラーハンドリング
if (result.isErr()) {
  core.setFailed(result.error.message);
  return;
}

core.info('Success!');
```

詳細は`.serena/memories/neverthrow_patterns.md`を参照。

## File Naming Conventions

### Source Files

- **Pattern**: `kebab-case.ts`
- **Examples**: `input-mapper.ts`, `file-metrics.ts`, `label-manager.ts`
- **Rationale**: Node.js慣習、URLフレンドリー

### Test Files

- **Pattern**: `[source-name].test.ts`
- **Examples**: `input-mapper.test.ts`, `file-metrics.test.ts`
- **Location**: `__tests__/`ディレクトリ（`src/`と分離）

### Type Definition Files

- **Pattern**: `types.ts`（単一ファイルで集約）
- **Export**: 名前付きエクスポート（`export interface Foo {}`）
- **Directory**: `types/`配下にドメイン別の型を配置。`i18n.d.ts`は自動生成のため手動編集しない

### Configuration Files

- **TypeScript**: `*.config.ts` (例: `vitest.config.ts`)
- **JavaScript**: `*.config.js` (例: `eslint.config.js`, `prettier.config.js`)
- **JSON**: 小文字（`package.json`, `tsconfig.json`）

## Import Organization

### Import Order

ESLint (`eslint-plugin-simple-import-sort`) で自動ソート：

1. **Node.js組み込みモジュール**: `import fs from 'fs'`
2. **外部依存関係**: `import { core } from '@actions/core'`
3. **内部モジュール**: `import { parseSize } from './parsers/size-parser.js'`
4. **型インポート**: `import type { Config } from './types.js'`

### Import Style

- **Named Imports優先**: `import { foo } from 'bar'`
- **Default Importsは最小限**: neverthrow, bytes等のみ
- **Type-only Imports**: `import type { ... }` で明示

### Module Resolution

- **拡張子**: `.js`を明示（Node16 module resolution）

  ```typescript
  // ✅ Good
  import { foo } from './utils.js';

  // ❌ Bad
  import { foo } from './utils';
  ```

- **Relative Paths**: 同一ディレクトリ内は`./`、サブディレクトリは`./parsers/`
- **絶対パス非使用**: パスエイリアス未設定

## Key Architectural Principles

### 1. Railway-Oriented Programming

すべての非同期処理とエラーが発生しうる処理は`Result<T, E>`を返す：

```typescript
// ✅ Good
export function parseSize(input: string): Result<number, SizeParseError>

// ❌ Bad
export function parseSize(input: string): number // throws
```

### 2. 型安全性の徹底

- `any`型の禁止（ESLintで強制）
- 型アサーション（`as`）の最小化
- `noUncheckedIndexedAccess`有効（配列アクセスは常に`T | undefined`）

### 3. 不変性の原則

- `const`を優先（`let`は必要最小限）
- 配列・オブジェクトの変更は`map`, `filter`, スプレッド構文を使用
- 破壊的変更の禁止

### 4. 純粋関数の優先

- 副作用（API呼び出し、I/O）と純粋関数を分離
- テスト容易性の向上
- 関数合成の促進

### 5. 明示的なエラーハンドリング

- `try-catch`の代わりに`Result`型
- エラーメッセージの多言語対応（現在は日英混在）
- エラーコンテキストの保持

### 6. 依存性注入パターン

GitHub APIクライアントやコンフィグは引数で渡し、テスタビリティを確保：

```typescript
// ✅ Good
export async function applyLabels(
  octokit: Octokit,
  config: LabelConfig,
  metrics: Metrics
): Promise<Result<void, LabelError>>

// ❌ Bad
export async function applyLabels(metrics: Metrics) {
  const octokit = getOctokit(process.env.GITHUB_TOKEN); // グローバル依存
}
```

### 7. テストファーストの設計

- 各モジュールに対応する`*.test.ts`が存在
- 統合テストとユニットテストの分離
- カバレッジ目標: 90%以上

## Development Workflow

### 1. 機能開発

```bash
# 1. 仕様書作成（Kiro）
/kiro:spec-init [feature-name]
/kiro:spec-requirements [feature-name]
/kiro:spec-design [feature-name]
/kiro:spec-tasks [feature-name]

# 2. 実装
pnpm dev  # Watch mode

# 3. テスト
pnpm test:watch

# 4. 品質チェック
pnpm check:all  # lint + type-check + test

# 5. ビルド
pnpm build

# 6. コミット
git add . && git commit -m "feat: ..."
```

### 2. リリース

```bash
# 1. バージョン更新
npm version [major|minor|patch]

# 2. ビルド
pnpm build

# 3. dist/コミット
git add dist/ && git commit -m "chore: update dist [skip ci]"

# 4. タグプッシュ
git push --follow-tags

# 5. GitHub Release作成
```

詳細は`docs/ja/release-process.md`を参照。

## Best Practices

### コーディング規約

`.serena/memories/code_style_conventions.md`を参照：

- TypeScript strict mode全設定
- ESLint/Prettierルール遵守
- neverthrowパターンの適用
- 関数の最大複雑度: 10以下（推奨）
- ファイルの最大行数: 300行以下（推奨）

### コミットメッセージ

Conventional Commits準拠：

- `feat:` 新機能
- `fix:` バグ修正
- `docs:` ドキュメント
- `test:` テスト追加・修正
- `refactor:` リファクタリング
- `chore:` ビルド・設定変更

### PR作成

- サイズ制限を遵守（このアクション自体でチェック）
- 自己レビュー実施
- テストカバレッジ維持
- `docs/`更新（必要に応じて）
