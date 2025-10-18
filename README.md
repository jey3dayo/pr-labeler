# PR Metrics Action

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
![Test Coverage](https://img.shields.io/badge/Coverage-93%25-green.svg)

PRのサイズと品質を自動的にチェックし、ラベル付けとコメント投稿を行うGitHub Actionです。

## 🚀 機能

- **📏 ファイルサイズチェック**: 個別ファイルのサイズ制限を監視
- **📝 行数制限チェック**: ファイルごと・PR全体の行数を制限
- **🏷️ 自動ラベル付け**: PRサイズに応じたラベル（S/M/L/XL/XXL）を自動適用
- **💬 コメント投稿**: 違反内容を詳細レポートとして自動コメント
- **📊 GitHub Actions Summary出力**: ワークフローサマリーページにメトリクスを表示
- **🎯 柔軟な除外パターン**: minimatchによる高度なファイル除外設定
- **🔄 冪等性**: 何度実行しても同じ結果を保証

## 📋 使用方法

### 基本的な使用例

```yaml
name: PR Size Check

on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: jey3dayo/pr-metrics-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

### カスタム設定例

```yaml
- uses: jey3dayo/pr-metrics-action@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    file_size_limit: "500KB"           # ファイルサイズ上限
    file_lines_limit: "500"            # ファイル行数上限
    pr_additions_limit: "1000"         # PR全体の追加行数上限
    pr_files_limit: "50"               # 最大ファイル数
    comment_on_pr: "auto"              # 違反時のみコメント
    fail_on_violation: "true"          # 違反時にCIを失敗させる
    apply_labels: "true"               # ラベル自動適用
    skip_draft_pr: "true"              # Draft PRをスキップ
    enable_summary: "true"             # GitHub Actions Summaryに出力
```

## 🔧 入力パラメータ

### 基本制限

| パラメータ           | 必須 | デフォルト | 説明                                           |
| -------------------- | ---- | ---------- | ---------------------------------------------- |
| `github_token`       | ✅   | -          | GitHubトークン (`${{ secrets.GITHUB_TOKEN }}`) |
| `file_size_limit`    | ❌   | `100KB`    | 個別ファイルのサイズ上限（例: 100KB, 1.5MB）   |
| `file_lines_limit`   | ❌   | `500`      | 個別ファイルの行数上限                         |
| `pr_additions_limit` | ❌   | `5000`     | PR全体の追加行数上限（diff-based）             |
| `pr_files_limit`     | ❌   | `50`       | 最大ファイル数                                 |

### ラベル設定

| パラメータ              | 必須 | デフォルト            | 説明                               |
| ----------------------- | ---- | --------------------- | ---------------------------------- |
| `apply_labels`          | ❌   | `true`                | 自動ラベル適用の有効/無効          |
| `auto_remove_labels`    | ❌   | `true`                | 制限クリア時にラベルを自動削除     |
| `apply_size_labels`     | ❌   | `true`                | サイズラベル（S/M/L/XL/XXL）の適用 |
| `size_label_thresholds` | ❌   | 下記参照              | サイズラベルの閾値設定（JSON）     |
| `large_files_label`     | ❌   | `auto:large-files`    | ファイルサイズ/行数違反ラベル      |
| `too_many_files_label`  | ❌   | `auto:too-many-files` | ファイル数超過ラベル               |

### 動作設定

| パラメータ          | 必須 | デフォルト | 説明                                |
| ------------------- | ---- | ---------- | ----------------------------------- |
| `skip_draft_pr`     | ❌   | `true`     | Draft PRをスキップ                  |
| `comment_on_pr`     | ❌   | `auto`     | コメントモード（always/auto/never） |
| `fail_on_violation` | ❌   | `false`    | 違反時にアクションを失敗させる      |
| `enable_summary`    | ❌   | `true`     | GitHub Actions Summaryに出力        |

### 除外設定

| パラメータ                    | 必須 | デフォルト | 説明                                       |
| ----------------------------- | ---- | ---------- | ------------------------------------------ |
| `additional_exclude_patterns` | ❌   | -          | 追加除外パターン（カンマまたは改行区切り） |

### サイズラベル閾値のデフォルト

```json
{
  "S": { "additions": 100, "files": 10 },
  "M": { "additions": 500, "files": 30 },
  "L": { "additions": 1000, "files": 50 }
}
```

**ラベル適用ルール**:

- **S**: additions ≤ 100 かつ files ≤ 10
- **M**: additions ≤ 500 かつ files ≤ 30
- **L**: additions ≤ 1000 かつ files ≤ 50
- **XL**: Lを超えるが2000行以下
- **XXL**: 2000行超

## 📊 GitHub Actions Summary出力

このアクションは、分析結果をGitHub ActionsのワークフローサマリーページにMarkdown形式で表示します。

**表示内容**:

- 📊 **基本メトリクス**: 総追加行数、ファイル数、除外ファイル数、実行時刻
- ⚠️ **違反情報**: ファイルサイズ/行数超過の詳細テーブル
- 📈 **大規模ファイル一覧**: 上位100ファイル（サイズ降順）
- 🕐 **実行時刻**: ISO 8601形式（UTC）

**サイズ制限と動作**:

GitHub Actions job summaryには以下の制限があります：

- **最大サイズ**: 1 MiB（1,048,576バイト）/ ステップ
- **オーバーフロー時**: サマリーアップロードが失敗し、エラーアノテーションが作成されます（ステップ/ジョブのステータスには影響しません）
- **表示制限**: 1ジョブあたり最大20個のステップサマリーが表示されます

大規模なPR（数千行、数百ファイル）の場合、サマリー出力を無効化するか、出力内容を制限することを推奨します：

```yaml
- uses: jey3dayo/pr-metrics-action@v1
  with:
    enable_summary: "false"  # Summary出力を無効化
```

## 📤 出力変数

| 変数名               | 型     | 説明                              | 例                                                    |
| -------------------- | ------ | --------------------------------- | ----------------------------------------------------- |
| `large_files`        | string | サイズ/行数超過ファイルのJSON配列 | `[{"file":"src/large.ts","actualValue":2000000,...}]` |
| `pr_additions`       | string | 総追加行数（diff-based）          | `"150"`                                               |
| `pr_files`           | string | 総ファイル数（削除除く）          | `"10"`                                                |
| `exceeds_file_size`  | string | ファイルサイズ超過の有無          | `"true"` / `"false"`                                  |
| `exceeds_file_lines` | string | ファイル行数超過の有無            | `"true"` / `"false"`                                  |
| `exceeds_additions`  | string | PR追加行数超過の有無              | `"true"` / `"false"`                                  |
| `exceeds_file_count` | string | ファイル数超過の有無              | `"true"` / `"false"`                                  |
| `has_violations`     | string | いずれかの違反が存在するか        | `"true"` / `"false"`                                  |

## 🏷️ 自動適用ラベル

### サイズラベル

- `size/S` - Small (additions ≤ 100 かつ files ≤ 10)
- `size/M` - Medium (additions ≤ 500 かつ files ≤ 30)
- `size/L` - Large (additions ≤ 1000 かつ files ≤ 50)
- `size/XL` - Extra Large (L超過、2000行以下)
- `size/XXL` - Huge (2000行超)

### 違反ラベル

- `auto:large-files` - ファイルサイズまたは行数制限違反
- `auto:too-many-files` - ファイル数制限違反

## 🔒 必要な権限

このアクションには以下の権限が必要です：

```yaml
permissions:
  pull-requests: write  # ラベル管理用
  issues: write         # コメント投稿用
  contents: read        # ファイル読み取り用
```

## 📝 高度な使用例

### フォークからのPR対応

フォークからのPRでは権限が制限されるため、`pull_request_target`イベントを使用：

```yaml
on:
  pull_request_target:
    types: [opened, synchronize, reopened]

jobs:
  check:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      issues: write
      contents: read
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}

      - uses: jey3dayo/pr-metrics-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

### 条件付き実行

特定のパスの変更時のみ実行：

```yaml
on:
  pull_request:
    paths:
      - 'src/**'
      - '!src/**/*.test.ts'

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: jey3dayo/pr-metrics-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          additional_exclude_patterns: |
            **/*.generated.ts
            **/*.min.js
```

### 厳格モード

違反を許可しない厳格なチェック：

```yaml
- uses: jey3dayo/pr-metrics-action@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    file_size_limit: "100KB"
    file_lines_limit: "300"
    pr_additions_limit: "500"
    fail_on_violation: "true"
    comment_on_pr: "always"
```

### Summary出力のみ（ラベル・コメントなし）

GitHub Actions Summaryのみを使用：

```yaml
- uses: jey3dayo/pr-metrics-action@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    apply_labels: "false"
    comment_on_pr: "never"
    enable_summary: "true"  # Summaryのみ出力
```

## 🎯 デフォルト除外パターン

以下のファイルは自動的に除外されます：

- ロックファイル（`package-lock.json`, `yarn.lock` など）
- 依存関係（`node_modules/**`, `vendor/**` など）
- ビルド成果物（`dist/**`, `build/**` など）
- 最小化ファイル（`*.min.js`, `*.min.css` など）
- ソースマップ（`*.map`）
- バイナリファイル（画像、動画、実行ファイル など）
- キャッシュ（`.cache/**`, `.turbo/**` など）
- 生成ファイル（`*.generated.*`, `*.gen.ts` など）

完全なリストは[pattern-matcher.ts](src/pattern-matcher.ts)を参照してください。

## 🤝 コントリビューション

プルリクエストを歓迎します！ 大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## 📄 ライセンス

MIT

## 🙏 謝辞

このプロジェクトは以下のライブラリを使用しています：

- [neverthrow](https://github.com/supermacro/neverthrow) - Railway-Oriented Programming
- [minimatch](https://github.com/isaacs/minimatch) - パターンマッチング
- [bytes](https://github.com/visionmedia/bytes.js) - サイズ解析
- [@actions/core](https://github.com/actions/toolkit) - GitHub Actions統合
- [@actions/github](https://github.com/actions/toolkit) - GitHub API
