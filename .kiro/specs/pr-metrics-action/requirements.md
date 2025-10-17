# Requirements Document

## Project Description (Input)

PR Metrics Action: PRのファイルサイズ、行数、ファイル数をチェックし、制限超過時に自動ラベル付けとコメント投稿を行う

GitHub Action実装プロンプト: PR Metrics Action

リポジトリ作成

新しいリポジトリ jey3dayo/pr-metrics-action を作成して、以下の仕様に基づいてGitHub Actionを実装してください。

プロジェクト構成

```
jey3dayo/pr-metrics-action/
├── action.yml           # Action定義ファイル (runs.main: dist/index.js)
├── src/
│   └── index.ts        # TypeScriptメインエントリー
├── dist/
│   └── index.js        # nccビルド出力（コミット対象）
├── package.json        # 依存関係とビルドスクリプト
├── tsconfig.json       # TypeScript設定
├── README.md          # 使用方法ドキュメント
├── LICENSE            # MITライセンス
├── .gitignore
├── .github/
│   └── workflows/
│       └── test.yml   # 自己テスト用ワークフロー
└── examples/
    └── usage.yml      # 使用例
```

### action.yml 仕様

```yaml
name: 'PR Metrics Action'
description: 'Check file sizes and line counts in PRs, automatically apply labels for large files'
author: 'jey3dayo'
branding:
  icon: 'file-text'
  color: 'orange'

inputs:
  # 基本制限
  file_size_limit:
    description: 'Maximum file size (e.g., 100KB, 1.5MB, 500000)'
    required: false
    default: '100KB'

  file_lines_limit:
    description: 'Maximum lines per file'
    required: false
    default: '500'

  pr_additions_limit:
    description: 'Maximum added lines for entire PR'
    required: false
    default: '5000'

  pr_files_limit:
    description: 'Maximum number of files in PR'
    required: false
    default: '50'

  # ラベル設定
  apply_labels:
    description: 'Apply labels to PR'
    required: false
    default: 'true'

  auto_remove_labels:
    description: 'Remove labels when limits are no longer exceeded'
    required: false
    default: 'true'

  apply_size_labels:
    description: 'Apply size labels (size/S, size/M, size/L, size/XL)'
    required: false
    default: 'true'

  size_label_thresholds:
    description: 'JSON string for size label thresholds'
    required: false
    default: '{"S": {"additions": 100, "files": 10}, "M": {"additions": 500, "files": 30}, "L": {"additions": 1000, "files": 50}}'

  large_files_label:
    description: 'Label for files exceeding size or line limits'
    required: false
    default: 'auto:large-files'

  too_many_files_label:
    description: 'Label for PRs with too many files'
    required: false
    default: 'auto:too-many-files'

  # 動作設定
  skip_draft_pr:
    description: 'Skip check for draft PRs'
    required: false
    default: 'true'

  comment_on_pr:
    description: 'Comment on PR (auto/always/never)'
    required: false
    default: 'auto'

  fail_on_violation:
    description: 'Fail workflow if limits exceeded'
    required: false
    default: 'false'

  # 除外パターン
  additional_exclude_patterns:
    description: 'Additional file patterns to exclude'
    required: false
    default: ''

  github_token:
    description: 'GitHub token (GITHUB_TOKEN/GH_TOKEN環境変数へのフォールバックあり)'
    required: true

outputs:
  large_files:
    description: 'JSON array of files exceeding size or line limits'
  pr_additions:
    description: 'Total lines added in PR'
  pr_files:
    description: 'Total number of files in PR'
  exceeds_file_size:
    description: 'Whether any file exceeds size limit ("true" | "false")'
  exceeds_file_lines:
    description: 'Whether any file exceeds line limit ("true" | "false")'
  exceeds_additions:
    description: 'Whether PR exceeds total additions limit ("true" | "false")'
  exceeds_file_count:
    description: 'Whether PR exceeds file count limit ("true" | "false")'
  has_violations:
    description: 'Whether any violation exists ("true" | "false")'

runs:
  using: 'node20'
  main: 'dist/index.js'
```

### 実装要件

#### 1. デフォルト除外パターン（自動適用）

```javascript
const DEFAULT_EXCLUDES = [
  // パッケージマネージャー
  '*.lock',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',

  // 依存関係ディレクトリ
  'node_modules/**',
  'vendor/**',
  '.yarn/**',
  '.pnp.*',

  // ビルド成果物
  'dist/**',
  'build/**',
  'out/**',
  '*.min.js',
  '*.min.css',
  '*.bundle.js',

  // 自動生成
  '*.generated.*',
  '**/generated/**',

  // TypeScript定義
  '*.d.ts',
  '*.d.ts.map',

  // IDE/エディタ
  '.idea/**',
  '.vscode/**',
  '*.swp',
  '*.swo',
  '*~',

  // システムファイル
  '.git/**',
  '.DS_Store',
  'Thumbs.db',

  // フレームワーク固有
  '.next/**',
  '.nuxt/**',
  '.turbo/**',
  '.svelte-kit/**',

  // その他
  '*.map',
  '*.map.json',
  'coverage/**',
  '.cache/**'
];
```

#### 2. サイズの自動パース機能

```javascript
// 以下の形式をサポート
parseSize('100KB')   // 102400
parseSize('1.5MB')   // 1572864
parseSize('500000')  // 500000
parseSize('2GB')     // 2147483648
```

#### 3. PR差分ファイルの分析

- git diff --name-only でPR差分ファイルを取得
- 各ファイルの行数とサイズをチェック
- PR全体の追加行数をgit diff --numstatで計算
- PR全体のファイル数をカウント（除外パターンを適用後）

#### 4. ラベル管理

- apply_labels: trueの場合、詳細問題ラベルを操作
- apply_size_labels: trueの場合、PRサイズラベル（size/S, size/M, size/L, size/XL）を自動付与
- auto_remove_labels: trueの場合、limit以下になったらラベル削除
- GitHub APIでラベルの追加/削除
- 詳細ラベル: auto:large-files, auto:too-many-files
- サイズラベル: size/S, size/M, size/L, size/XL（総合判定）

#### 5. コメント投稿

- comment_on_pr: 'auto': limit超過時のみ
- comment_on_pr: 'always': 常に投稿
- comment_on_pr: 'never': 投稿しない
- 既存コメントがあれば更新（重複防止）

#### 6. Draft PRの処理

- skip_draft_pr: trueの場合、Draft PRは全チェックをスキップ

### コメントフォーマット

#### Limit超過時

```markdown
## ⚠️ PR Size Check

**Issues detected:**
- 2 files exceed size limits
- PR adds 6,234 lines (limit: 5,000)
- PR contains 75 files (limit: 50)

### Large Files
| File | Lines | Size |
|------|-------|------|
| `src/components/Dashboard.tsx` | 823 ⚠️ | 142KB ⚠️ |

### Labels Applied
- `size/XL` (PR size)
- `auto:large-files`
- `auto:too-many-files`
```

#### 修正後（auto_remove_labels有効時）

```markdown
## ✅ PR Size Check Passed

All files are within limits now.

### Labels Removed
- Removed `auto:large-files`
- Removed `auto:too-many-files`
- Updated size label to `size/M`
```

### package.json

```json
{
  "name": "pr-metrics-action",
  "version": "1.0.0",
  "description": "GitHub Action for PR file size and metrics checking",
  "main": "dist/index.js",
  "author": "jey3dayo",
  "license": "MIT",
  "engines": {
    "node": ">=20"
  },
  "packageManager": "pnpm@10.18.3",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "ncc build src/index.ts -o dist --source-map --license licenses.txt",
    "test": "run-p lint type-check test:vitest",
    "test:vitest": "vitest run",
    "check": "run-p lint type-check format:check",
    "check:all": "run-s check test:vitest",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "type-check": "tsc --noEmit",
    "format": "run-s lint:fix format:prettier",
    "format:prettier": "prettier --write . --log-level warn",
    "format:check": "prettier --check ."
  },
  "dependencies": {
    "@actions/core": "^1.10.0",
    "@actions/github": "^6.0.0",
    "minimatch": "^9.0.0",
    "bytes": "^3.1.2",
    "neverthrow": "^8.2.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.37.0",
    "@types/bytes": "^3.1.5",
    "@types/minimatch": "^6.0.0",
    "@types/node": "^24.7.2",
    "@vercel/ncc": "^0.38.4",
    "@vitest/coverage-v8": "^3.2.4",
    "@vitest/ui": "^3.2.4",
    "eslint": "^9.37.0",
    "eslint-config-prettier": "^10.1.8",
    "npm-run-all": "^4.1.5",
    "prettier": "^3.6.2",
    "tsx": "^4.20.6",
    "typescript": "^5.9.3",
    "typescript-eslint": "^8.46.1",
    "vitest": "^3.2.4"
  }
}
```

### テスト用ワークフロー例

```yaml
name: Test PR Metrics
on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]

permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: jey3dayo/pr-metrics-action@main
        with:
          file_size_limit: '100KB'
          file_lines_limit: '500'
          pr_additions_limit: '5000'
          pr_files_limit: '50'
          github_token: ${{ secrets.GITHUB_TOKEN }}

  # 開発用ビルド例
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm check:all
      - run: pnpm build
```

### 重要な実装ポイント

1. エラーハンドリング: git操作やAPI呼び出しの失敗を適切に処理
2. パフォーマンス: 大きなPRでも効率的に動作
3. 冪等性: 同じPRで複数回実行しても安全
4. ログ出力: デバッグしやすいように適切なログを出力
5. GitHub Actions Summary: 結果を$GITHUB_STEP_SUMMARYにも出力

## Requirements

## 概要

PR Metrics ActionはGitHub Actionsで動作する自動品質チェックツールです。プルリクエストに含まれるファイルのサイズ、行数、ファイル数を監視し、設定した制限値を超えた場合に自動的にラベルを付与し、コメントを投稿することで、コードレビューの効率化と品質向上を支援します。

### 主要機能

- **ファイル数制限機能**: PRに含まれるファイル数の制限チェック機能
- **ラベルプレフィックス**: すべての自動付与ラベルに`auto:`プレフィックスを使用（例：`auto:large-files`）
- **除外パターン**: デフォルトで40種類以上のパターンを自動除外（lockファイル、minifiedファイル、ビルド成果物、node_modules、IDEファイル等）
- **文書化**: README.mdに包括的な使用方法とカスタマイズ例を提供

### 技術的決定事項

- **エラーハンドリング**: neverthrowライブラリによるResult<T, E>パターンを採用
  - 型安全なエラー処理
  - エラーの見落とし防止
  - 関数型プログラミングパターンの活用
  - チェーン可能なエラー処理（map, mapErr, andThen等）

## 要件

### 要件1: ファイルメトリクス分析

**目的:** レビュアーとして、PRに含まれる個々のファイルのサイズと行数を自動的に検証したい。これにより、レビューが困難な大きすぎるファイルを早期に発見できる。

#### 受け入れ基準

1. WHEN プルリクエストが作成または更新された THEN PR Metrics Action SHALL 変更されたすべてのファイルを特定する
2. WHEN ファイルが特定された THEN PR Metrics Action SHALL 各ファイルのサイズ（バイト単位）を計測する
3. WHEN ファイルが特定された THEN PR Metrics Action SHALL 各ファイルの現在の総行数を計測する（差分の追加行数ではなく、ファイル全体の行数）
4. IF ファイルのサイズが`file_size_limit`を超えている THEN PR Metrics Action SHALL そのファイルを制限超過として記録する
5. IF ファイルの行数が`file_lines_limit`を超えている THEN PR Metrics Action SHALL そのファイルを制限超過として記録する
6. WHEN サイズ計測時に`100KB`、`1.5MB`、`2GB`などの単位付き文字列が指定された THEN PR Metrics Action SHALL それをバイト単位に変換する
7. WHERE ファイルがデフォルト除外パターンに一致する THE PR Metrics Action SHALL そのファイルを分析から除外する
   - デフォルト除外パターン（完全リスト）:
     - パッケージマネージャー: `*.lock`、`package-lock.json`、`yarn.lock`、`pnpm-lock.yaml`、`bun.lockb`
     - 依存関係: `node_modules/**`、`vendor/**`、`.yarn/**`、`.pnp.*`
     - ビルド成果物: `dist/**`、`build/**`、`out/**`、`*.min.js`、`*.min.css`、`*.bundle.js`
     - 自動生成: `*.generated.*`、`**/generated/**`
     - TypeScript: `*.d.ts`、`*.d.ts.map`
     - IDE/エディタ: `.idea/**`、`.vscode/**`、`*.swp`、`*.swo`、`*~`
     - システム: `.git/**`、`.DS_Store`、`Thumbs.db`
     - フレームワーク: `.next/**`、`.nuxt/**`、`.turbo/**`、`.svelte-kit/**`
     - その他: `*.map`、`*.map.json`、`coverage/**`、`.cache/**`
8. WHERE 追加の除外パターンが`additional_exclude_patterns`で指定されている THE PR Metrics Action SHALL そのパターンに一致するファイルも分析から除外する
   - パターンのセパレータ: カンマ（`,`）または改行（`\n`）で区切り、前後の空白は自動トリム
   - パターンの正規化: 大文字小文字は区別、パスはリポジトリルートからの相対パスとして評価
   - 空のパターンは無視（空文字列、空白のみの行）
9. WHEN ファイルがバイナリファイルまたは行数が取得できない場合 THEN PR Metrics Action SHALL サイズのみで評価し、行数制限チェックはスキップする
10. WHEN 変更種別が`renamed`のファイルを分析する THEN PR Metrics Action SHALL 新しいパスで評価する
11. WHERE 変更種別が`removed`のファイル THE PR Metrics Action SHALL サイズ/行数評価およびファイル数カウントから除外する

### 要件2: PR全体メトリクス分析

**目的:** レビュアーとして、PR全体の規模を把握し、大きすぎるPRを識別したい。これにより、レビューの計画と優先順位付けができる。

#### 受け入れ基準

1. WHEN プルリクエストが分析される THEN PR Metrics Action SHALL PR全体で追加された行数の合計を計算する（差分ベース、git diff --numstat使用）
2. WHEN プルリクエストが分析される THEN PR Metrics Action SHALL 変更されたファイルの総数を計算する（除外パターン適用後、変更種別が`added`、`modified`、`renamed`のファイルのみカウント、`removed`は除外）
3. IF PR全体の追加行数が`pr_additions_limit`を超えている THEN PR Metrics Action SHALL PRを制限超過として記録する
4. IF PR内のファイル数が`pr_files_limit`を超えている THEN PR Metrics Action SHALL PRを制限超過として記録する
5. WHEN 分析が完了した THEN PR Metrics Action SHALL `pr_additions`として総追加行数を出力する
6. WHEN 分析が完了した THEN PR Metrics Action SHALL `pr_files`として総ファイル数を出力する

### 要件3: 自動ラベル管理

**目的:** 開発者として、制限超過状態を視覚的に把握できるように、自動的にラベルが付与・削除されることを期待する。

#### 受け入れ基準

1. IF `apply_labels`がtrueに設定されている AND ファイルサイズまたは行数が制限を超えている THEN PR Metrics Action SHALL `large_files_label`（デフォルト: auto:large-files）を追加する
2. IF `apply_labels`がtrueに設定されている AND PRのファイル数が制限を超えている THEN PR Metrics Action SHALL `too_many_files_label`（デフォルト: auto:too-many-files）を追加する
3. IF `apply_size_labels`がtrueに設定されている THEN PR Metrics Action SHALL PR全体のサイズに基づいて適切なサイズラベル（size/S, size/M, size/L, size/XL）を追加する
4. IF `auto_remove_labels`がtrueに設定されている AND 制限超過が解消された THEN PR Metrics Action SHALL 対応するラベルを削除する
5. WHEN ラベル操作を実行する THEN PR Metrics Action SHALL GitHub APIを使用してラベルの追加・削除を行う
6. IF ラベルがすでに存在する THEN PR Metrics Action SHALL 重複してラベルを追加しない
7. WHEN サイズラベルを適用する THEN PR Metrics Action SHALL `size_label_thresholds`の閾値に基づいて判定する
   - サイズ判定ルール: `additions`と`files`をOR条件で評価（いずれか一方でも閾値を超えたらより大きいサイズとして判定）
   - size/S: additions ≤ 100 AND files ≤ 10
   - size/M: additions ≤ 500 AND files ≤ 30
   - size/L: additions ≤ 1000 AND files ≤ 50
   - size/XL: Lの閾値（additions > 1000 OR files > 50）を超えた場合
8. WHEN サイズラベルが変更される THEN PR Metrics Action SHALL 古いサイズラベルを削除し新しいラベルを追加する
9. WHEN 分析完了時 THEN PR Metrics Action SHALL 以下の状態を出力する:
   - `exceeds_file_size`: ファイルサイズ制限超過の有無
   - `exceeds_file_lines`: ファイル行数制限超過の有無
   - `exceeds_additions`: PR追加行数制限超過の有無
   - `exceeds_file_count`: PRファイル数制限超過の有無
   - `has_violations`: いずれかの違反の有無
   - `large_files`: 制限超過ファイルのJSON配列（詳細情報含む）
     ```typescript
     // large_files出力のJSONスキーマ定義
     interface ViolationDetail {
       file: string;           // ファイルパス
       actualValue: number;    // 実際の値（サイズまたは行数）
       limit: number;          // 制限値
       violationType: 'size' | 'lines';  // 違反タイプ
       severity: 'critical' | 'warning'; // 重要度
     }
     // 出力例: [{"file":"src/large.ts","actualValue":150000,"limit":102400,"violationType":"size","severity":"critical"}]
     ```

### 要件4: PRコメント投稿

**目的:** レビュアーとして、制限超過の詳細情報をPRコメントで確認したい。これにより、問題点を素早く把握できる。

#### 受け入れ基準

1. IF `comment_on_pr`が'auto'に設定されている AND 制限超過が存在する THEN PR Metrics Action SHALL 詳細レポートをコメントとして投稿する
2. IF `comment_on_pr`が'always'に設定されている THEN PR Metrics Action SHALL 制限超過の有無に関わらずレポートを投稿する
3. IF `comment_on_pr`が'never'に設定されている THEN PR Metrics Action SHALL コメントを投稿しない
4. WHEN コメントを投稿する AND 既存のPR Metrics Actionコメントが存在する THEN PR Metrics Action SHALL 既存コメントを更新する（新規作成しない）
5. WHEN 制限超過レポートを作成する THEN PR Metrics Action SHALL 超過ファイル一覧、追加行数、ファイル数を含める
6. WHEN 制限超過レポートを作成する THEN PR Metrics Action SHALL 表形式で見やすく情報を表示する
7. IF `auto_remove_labels`が有効 AND すべての制限超過が解消された THEN PR Metrics Action SHALL 成功メッセージと削除されたラベル一覧を表示する

### 要件5: フォークPRと権限処理

**目的:** オープンソースプロジェクトの管理者として、フォークからのPRでも安全にメトリクス分析を実行したい。これにより、外部貢献者のコードも適切に評価できる。

#### 受け入れ基準

1. WHEN フォークPRで実行される AND 権限が不足している（`pull-requests: write`または`issues: write`がない） THEN PR Metrics Action SHALL ラベル/コメント操作をスキップし、分析処理は継続する
2. IF 権限不足でラベル/コメント操作がスキップされた THEN PR Metrics Action SHALL `core.info`でスキップ理由をログ出力する（例：「Insufficient permissions to add labels. Skipping label management.」）
3. WHERE 権限不足が検出された THE PR Metrics Action SHALL 出力変数（`exceeds_*`、`has_violations`等）は正常に設定し、ワークフローは成功として終了する
4. WHEN `pull_request_target`イベントを使用する THE PR Metrics Action SHALL セキュリティリスクの警告をREADMEに記載する（信頼できないコードの実行リスク）
5. IF GitHub Enterprise環境で実行される THEN PR Metrics Action SHALL `GITHUB_API_URL`環境変数を自動検出し、適切なAPIエンドポイントを使用する

### 要件6: Draft PR処理

**目的:** 開発者として、作業中のDraft PRでは不要なチェックをスキップしたい。これにより、開発中の無駄な通知を避けられる。

#### 受け入れ基準

1. IF `skip_draft_pr`がtrueに設定されている AND PRがDraftステータスである THEN PR Metrics Action SHALL すべてのチェックをスキップする
2. WHEN Draft PRのチェックをスキップする THEN PR Metrics Action SHALL ログにスキップした旨を記録する
3. IF Draft PRがReady for reviewに変更された THEN PR Metrics Action SHALL 通常のチェックを実行する
4. WHERE GitHub Actions設定でイベントタイプを指定する THE PR Metrics Action SHALL `pull_request.types: [opened, synchronize, reopened, ready_for_review]`を推奨設定とする

### 要件7: ワークフロー制御

**目的:** CI/CD管理者として、制限超過時にビルドを失敗させるオプションが欲しい。これにより、品質基準を強制できる。

#### 受け入れ基準

1. IF `fail_on_violation`がtrueに設定されている AND いずれかの制限超過が検出された（`exceeds_file_size`、`exceeds_file_lines`、`exceeds_additions`、`exceeds_file_count`のいずれかがtrue） THEN PR Metrics Action SHALL ワークフローを失敗ステータスで終了する（`core.setFailed`を呼び出す）
2. IF `fail_on_violation`がfalseに設定されている THEN PR Metrics Action SHALL 制限超過があっても成功ステータスで終了する
3. WHEN ワークフローが失敗する THEN PR Metrics Action SHALL エラーメッセージで失敗理由を明確に示す
4. WHEN `fail_on_violation`によりワークフローが失敗する場合でも THEN PR Metrics Action SHALL `comment_on_pr`ポリシーに従いコメント投稿は独立して実行する（失敗とコメント投稿は独立した機能）
5. IF `fail_on_violation`がtrueに設定されている THEN PR Metrics Action SHALL ラベル追加とコメント投稿を先に実行し、その後`core.setFailed`を呼び出す（処理順序: ラベル→コメント→setFailed）
6. WHILE 処理を実行中 THE PR Metrics Action SHALL 進捗状況をログに出力する
7. WHEN エラーが発生した THEN PR Metrics Action SHALL エラーの詳細をログに記録し、適切にエラーハンドリングする
8. WHEN エラー処理を実装する THEN PR Metrics Action SHALL neverthrowのResult型を使用して型安全にエラーを扱う
9. WHERE エラー型を定義する THE PR Metrics Action SHALL 以下の型を含める
   - `FileAnalysisError`: ファイル分析時のエラー
   - `GitHubAPIError`: GitHub API呼び出しエラー
   - `ConfigurationError`: 設定値の検証エラー
   - `ParseError`: サイズパースエラー
   - `FileSystemError`: ファイル読み取りエラー
   - `ViolationError`: 制限違反検出時のエラー
   - `DiffError`: 差分取得エラー
   - `PatternError`: パターン検証エラー

### 要件8: GitHub Actions統合

**目的:** 開発者として、標準的なGitHub Actions形式でこのツールを使用したい。これにより、既存のワークフローに簡単に統合できる。

#### 受け入れ基準

1. WHEN GitHub Actionsで実行される THEN PR Metrics Action SHALL `@actions/core`と`@actions/github`ライブラリを使用する
2. WHEN 実行される THEN PR Metrics Action SHALL 必須パラメータ`github_token`を受け取る
3. WHEN 結果をサマリーに出力する THEN PR Metrics Action SHALL `$GITHUB_STEP_SUMMARY`環境変数を使用する
4. WHERE Node.js環境で実行される THE PR Metrics Action SHALL Node.js 20で動作する
5. WHEN 複数回実行される THEN PR Metrics Action SHALL 冪等性を保証し、同じ結果を生成する
6. IF 同一SHAで再実行される THEN PR Metrics Action SHALL 既存のラベル/コメントを維持し、重複を作成しない（冪等性保証）
7. WHEN 差分取得をローカルgitで試行する AND gitコマンドが失敗する（checkout未実行、shallow clone等） THEN PR Metrics Action SHALL GitHub APIへ自動的にフォールバックする

### 要件9: 文書化（README.md）

**目的:** ユーザーとして、このActionの使い方を理解し、簡単に導入できるような明確なドキュメントが欲しい。これにより、迅速に利用開始できる。

#### 受け入れ基準

1. WHEN README.mdが作成される THEN PR Metrics Action SHALL 以下のセクションを含む
   - 概要説明とバッジ（CI状態、バージョン、ライセンス）
   - 主要機能の一覧（ファイルサイズ、行数、ファイル数のチェック、自動ラベリング、コメント投稿）
   - クイックスタート（最小限の設定例）
   - 入力パラメータの詳細表（名前、デフォルト値、説明、必須/任意）
   - 出力値の詳細表（名前、説明、値の例）
   - 使用例（基本、カスタムラベル、制限値変更、Draft PRスキップ、ビルド失敗設定）
   - 除外パターンの説明とカスタマイズ例
   - トラブルシューティングガイド
   - ライセンス情報（MIT）
2. WHERE 設定例が提示される THE PR Metrics Action SHALL 実際に動作するYAMLコードを含める
3. WHEN デフォルト値が説明される THEN PR Metrics Action SHALL auto:プレフィックスを持つラベル名を明記する
4. WHERE 除外パターンが説明される THE PR Metrics Action SHALL デフォルトの除外パターンリストを完全に記載する
5. WHEN 使用例を提示する THEN PR Metrics Action SHALL 最低5つの異なるユースケースを含める
