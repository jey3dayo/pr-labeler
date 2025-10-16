# Requirements Document

## Project Description (Input)

PR Metrics Action: PRのファイルサイズ、行数、ファイル数をチェックし、制限超過時に自動ラベル付けとコメント投稿を行う

GitHub Action実装プロンプト: PR Metrics Action

リポジトリ作成

新しいリポジトリ jey3dayo/pr-metrics-action を作成して、以下の仕様に基づいてGitHub Actionを実装してください。

プロジェクト構成

```
jey3dayo/pr-metrics-action/
├── action.yml           # Action定義ファイル
├── index.js            # メインロジック
├── package.json        # 依存関係
├── package-lock.json
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

  large_file_label:
    description: 'Label for large files'
    required: false
    default: 'auto:large-file'

  large_pr_label:
    description: 'Label for large PRs'
    required: false
    default: 'auto:large-pr'

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
    description: 'GitHub token'
    required: true
    default: ${{ github.token }}

outputs:
  has_large_files:
    description: 'Whether any files exceed limits'
  has_large_pr:
    description: 'Whether PR exceeds additions limit'
  has_too_many_files:
    description: 'Whether PR has too many files'
  total_additions:
    description: 'Total lines added'
  total_files:
    description: 'Total number of files in PR'

runs:
  using: 'node20'
  main: 'index.js'
```

### 実装要件

#### 1. デフォルト除外パターン（自動適用）

```javascript
const DEFAULT_EXCLUDES = [
  '*.lock',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lockb',
  '*.min.js',
  '*.min.css',
  '*.bundle.js',
  '*.generated.*',
  '*.d.ts',
  'dist/**/*',
  'build/**/*',
  '.next/**/*'
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

- apply_labels: trueの場合のみラベル操作
- auto_remove_labels: trueの場合、limit以下になったらラベル削除
- GitHub APIでラベルの追加/削除
- 対象ラベル: auto:large-file, auto:large-pr, auto:too-many-files

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
- `auto:large-file`
- `auto:large-pr`
- `auto:too-many-files`
```

#### 修正後（auto_remove_labels有効時）

```markdown
## ✅ PR Size Check Passed

All files are within limits now.

### Labels Removed
- Removed `auto:large-file`
- Removed `auto:large-pr`
- Removed `auto:too-many-files`
```

### package.json

```json
{
  "name": "pr-metrics-action",
  "version": "1.0.0",
  "description": "GitHub Action for PR file size and metrics checking",
  "main": "index.js",
  "author": "jey3dayo",
  "license": "MIT",
  "dependencies": {
    "@actions/core": "^1.10.0",
    "@actions/github": "^6.0.0",
    "@octokit/rest": "^20.0.0",
    "minimatch": "^9.0.0",
    "bytes": "^3.1.2"
  }
}
```

### テスト用ワークフロー例

```yaml
name: Test PR Metrics
on:
  pull_request:
    types: [opened, synchronize, reopened]

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
```

### 重要な実装ポイント

1. エラーハンドリング: git操作やAPI呼び出しの失敗を適切に処理
2. パフォーマンス: 大きなPRでも効率的に動作
3. 冪等性: 同じPRで複数回実行しても安全
4. ログ出力: デバッグしやすいように適切なログを出力
5. GitHub Actions Summary: 結果を$GITHUB_STEP_SUMMARYにも出力

## Requirements

<!-- Will be generated in /kiro:spec-requirements phase -->
