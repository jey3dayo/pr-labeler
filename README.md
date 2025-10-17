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
    file_size_limit: "500KB"          # ファイルサイズ上限
    file_line_limit: "500"             # ファイル行数上限
    max_added_lines: "1000"            # PR全体の追加行数上限
    max_file_count: "50"               # 最大ファイル数
    comment_mode: "auto"               # 違反時のみコメント
    fail_on_violation: true            # 違反時にCIを失敗させる
    apply_labels: true                 # ラベル自動適用
    skip_draft: true                   # Draft PRをスキップ
```

## 🔧 入力パラメータ

| パラメータ              | 必須 | デフォルト | 説明                                                  |
| ----------------------- | ---- | ---------- | ----------------------------------------------------- |
| `github_token`          | ✅   | -          | GitHubトークン（通常は`${{ secrets.GITHUB_TOKEN }}`） |
| `file_size_limit`       | ❌   | `1MB`      | 個別ファイルのサイズ上限                              |
| `file_line_limit`       | ❌   | `1000`     | 個別ファイルの行数上限                                |
| `max_added_lines`       | ❌   | `5000`     | PR全体の追加行数上限                                  |
| `max_file_count`        | ❌   | `100`      | 最大ファイル数                                        |
| `exclude_patterns`      | ❌   | -          | 除外パターン（カンマまたは改行区切り）                |
| `comment_mode`          | ❌   | `auto`     | コメントモード（always/auto/never）                   |
| `fail_on_violation`     | ❌   | `false`    | 違反時にアクションを失敗させる                        |
| `apply_labels`          | ❌   | `true`     | 自動ラベル適用の有効/無効                             |
| `skip_draft`            | ❌   | `true`     | Draft PRをスキップ                                    |
| `size_label_thresholds` | ❌   | 下記参照   | サイズラベルの閾値設定（JSON）                        |

### サイズラベル閾値のデフォルト

```json
{
  "small": 10,      // S: 10行以下
  "medium": 100,    // M: 100行以下
  "large": 500,     // L: 500行以下
  "xlarge": 1000    // XL: 1000行以下、XXL: 1000行超
}
```

## 📤 出力変数

| 変数名               | 説明                       | 例                 |
| -------------------- | -------------------------- | ------------------ |
| `total_additions`    | 総追加行数                 | `150`              |
| `total_files`        | 総ファイル数               | `10`               |
| `has_violations`     | 違反の有無                 | `true`             |
| `large_files`        | サイズ超過ファイルのリスト | `["src/large.ts"]` |
| `exceeds_additions`  | 追加行数超過の有無         | `false`            |
| `exceeds_file_count` | ファイル数超過の有無       | `false`            |
| `exceeds_file_lines` | 行数超過ファイルのリスト   | `["src/long.ts"]`  |
| `size_label`         | 適用されたサイズラベル     | `size:M`           |

## 🏷️ 自動適用ラベル

### サイズラベル

- `size:S` - Small (≤10 additions)
- `size:M` - Medium (≤100 additions)
- `size:L` - Large (≤500 additions)
- `size:XL` - Extra Large (≤1000 additions)
- `size:XXL` - Huge (>1000 additions)

### 違反ラベル

- `auto:large-files` - ファイルサイズ制限違反
- `auto:too-many-lines` - ファイル行数制限違反
- `auto:excessive-changes` - PR追加行数制限違反
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
          exclude_patterns: |
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
    file_line_limit: "300"
    max_added_lines: "500"
    fail_on_violation: true
    comment_mode: "always"
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
