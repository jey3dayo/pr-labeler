# Project Structure - PR Metrics Action

## Root Directory Organization

```
pr-metrics-action/
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

## Subdirectory Structures

### `src/` - Source Code

```
src/
├── index.ts              # エントリーポイント（main関数）
├── types.ts              # 共通型定義
├── errors.ts             # エラークラス定義
├── input-mapper.ts       # Actions入力パース・検証
├── file-metrics.ts       # ファイルメトリクス分析
├── diff-strategy.ts      # Git差分ベースの分析戦略
├── pattern-matcher.ts    # ファイル除外パターンマッチ
├── label-manager.ts      # GitHubラベル管理
├── comment-manager.ts    # PRコメント管理
├── report-formatter.ts   # Markdownレポート生成
├── actions-io.ts         # GitHub Actions I/O（summary, output）
└── parsers/              # パーサーモジュール
    └── size-parser.ts    # サイズ文字列パース（"100KB" → バイト数）
```

### `__tests__/` - Test Files

```
__tests__/
├── __snapshots__/             # Vitestスナップショット
├── index.test.ts              # メインフロー統合テスト
├── input-mapper.test.ts       # 入力検証テスト
├── file-metrics.test.ts       # メトリクス分析テスト
├── diff-strategy.test.ts      # 差分戦略テスト
├── pattern-matcher.test.ts    # パターンマッチテスト
├── label-manager.test.ts      # ラベル管理テスト
├── comment-manager.test.ts    # コメント管理テスト
├── report-formatter.test.ts   # レポート生成テスト
├── actions-io.test.ts         # Actions I/Oテスト
├── errors.test.ts             # エラーハンドリングテスト
├── integration.test.ts        # 統合テスト
└── size-parser.test.ts        # サイズパーサーテスト
```

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
├── API.md                    # API仕様
├── release-process.md        # リリースプロセス
├── documentation-guidelines.md # ドキュメント作成ガイドライン
└── _review-codex.md          # コードレビュー基準
```

## Code Organization Patterns

### Module Responsibility

各モジュールは単一責任原則に従い、明確な境界を持つ：

1. **Input Mapper**: 入力検証のみ（ビジネスロジックなし）
2. **File Metrics**: ファイル分析のみ（API呼び出しなし）
3. **Diff Strategy**: Git差分収集のみ（分析ロジックなし）
4. **Pattern Matcher**: パターンマッチのみ（ファイルI/Oなし）
5. **Label Manager**: ラベル操作のみ（メトリクス計算なし）
6. **Comment Manager**: コメント操作のみ（レポート生成は委譲）
7. **Report Formatter**: Markdown生成のみ（GitHub API呼び出しなし）

### Data Flow Pattern

```
Input (GitHub Actions)
  ↓
Input Mapper → Validated Config
  ↓
Diff Strategy → File List
  ↓
Pattern Matcher → Filtered Files
  ↓
File Metrics → Metrics Data
  ↓
┌─────────────┴─────────────┐
↓                           ↓
Label Manager          Report Formatter
  ↓                           ↓
GitHub API (labels)    Comment Manager
                              ↓
                       GitHub API (comments)
                              ↓
                       Actions I/O (summary, outputs)
```

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

詳細は`docs/release-process.md`を参照。

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
