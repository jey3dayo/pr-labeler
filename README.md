# PR Labeler

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
![Test Coverage](https://img.shields.io/badge/Coverage-93%25-green.svg)

PRのサイズと品質を自動的にチェックし、ラベル付けとコメント投稿を行うGitHub Actionです。

## 🚀 機能

### コア機能

- **📏 ファイルサイズチェック**: 個別ファイルのサイズ制限を監視
- **📝 行数制限チェック**: ファイルごと・PR全体の行数を制限
- **🏷️ 自動ラベル付け**: PRサイズに応じたラベル（S/M/L/XL/XXL）を自動適用
- **💬 コメント投稿**: 違反内容を詳細レポートとして自動コメント
- **📊 GitHub Actions Summary出力**: ワークフローサマリーページにメトリクスを表示
- **🎯 柔軟な除外パターン**: minimatchによる高度なファイル除外設定
- **🔄 冪等性**: 何度実行しても同じ結果を保証

### 🆕 PR Labeler - インテリジェント自動ラベル付け

PRメトリクス分析に基づいた高度な自動ラベル付け機能。複数のディメンションでPRを自動分類します。

**サイズベースラベル**（自動置換）:

- `size/small` - 追加行数 < 200行
- `size/medium` - 追加行数 200-499行
- `size/large` - 追加行数 500-999行
- `size/xlarge` - 追加行数 1000-2999行
- `size/xxlarge` - 追加行数 >= 3000行

**カテゴリベースラベル**（加法的）:

- `category/tests` - テストファイルの変更
- `category/ci-cd` - CI/CD設定の変更
- `category/documentation` - ドキュメント変更
- `category/config` - 設定ファイルの変更（tsconfig.json, eslint.config.js等）
- `category/spec` - 仕様書・計画ドキュメントの変更（.kiro/, spec/等）
- `category/dependencies` - 依存関係ファイルの変更（多言語対応: Node.js, Go, Python, Rust, Ruby）
- カスタムカテゴリをYAML設定で追加可能

**リスクベースラベル**:

- `risk/high` - テストなしでコア機能変更
- `risk/medium` - 設定ファイル変更

**特徴**:

- ✅ ゼロ設定で即利用可能（デフォルト設定内蔵）
- ✅ `.github/pr-labeler.yml`でカスタマイズ可能
- ✅ 冪等性保証（同じPR状態で再実行しても同じラベル）
- ✅ 権限不足時の適切な処理（フォークPR対応）
- ✅ **🆕 選択的有効化**: 各ラベル種別（size/complexity/category/risk）を個別にON/OFF可能
- ✅ **🆕 統一されたinput命名**: `*_enabled` と `*_thresholds` の一貫した命名規則

### 🆕 Directory-Based Labeler - ディレクトリパスベースの自動ラベル付け

変更ファイルのディレクトリパスに基づいて、自動的にGitHubラベルを付与する機能です。

**主要機能**:

- **📁 パスベースマッピング**: ディレクトリパターン（glob）からラベルを自動決定
- **🎯 優先順位制御**: priority、最長マッチ、定義順で柔軟な制御
- **🔄 名前空間ポリシー**: exclusive（置換）/additive（追加）で競合解決
- **🛡️ 安全設計**: デフォルトで無効、明示的な有効化が必要
- **✨ ラベル自動作成**: 未存在ラベルの自動作成オプション

**設定例**（`.github/directory-labeler.yml`）:

```yaml
version: 1
rules:
  - label: 'area:frontend'
    include:
      - 'src/components/**'
      - 'src/pages/**'
    exclude:
      - '**/__tests__/**'
    priority: 20

  - label: 'area:backend'
    include:
      - 'src/api/**'
      - 'src/services/**'
    priority: 20

namespaces:
  exclusive: ['area']  # area:*ラベルは1つのみ
  additive: ['scope']  # scope:*ラベルは複数可
```

**有効化**:

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    enable_directory_labeling: true  # 機能を有効化
```

詳細は[`.github/directory-labeler.yml.example`](.github/directory-labeler.yml.example)を参照してください。

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

      - uses: jey3dayo/pr-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

### 実践例（このリポジトリで使用中）

このリポジトリでは以下の設定で実際に動作しています。このファイルをコピーして `.github/workflows/` に配置すればすぐに使えます：

```yaml
# .github/workflows/pr-check.yml
name: PR Size Check

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  pr-metrics:
    name: PR Metrics Check
    runs-on: ubuntu-latest

    # 必要な権限を設定
    permissions:
      pull-requests: write  # ラベル管理用
      issues: write         # コメント投稿用
      contents: read        # ファイル読み取り用

    steps:
      - uses: actions/checkout@v4
        with:
          # PR全体の差分を取得するため fetch-depth: 0 が必要
          fetch-depth: 0

      - uses: jey3dayo/pr-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}

          # ファイルサイズ・行数制限
          file_size_limit: "100KB"      # 個別ファイルの最大サイズ
          file_lines_limit: "500"       # 個別ファイルの最大行数
          pr_additions_limit: "5000"    # PR全体の追加行数上限
          pr_files_limit: "50"          # 変更ファイル数の上限

          # 動作設定
          comment_on_pr: "auto"         # 違反時のみコメント (always/auto/never)
          apply_labels: "true"          # サイズラベル自動適用 (size/S, size/M など)
          enable_summary: "true"        # GitHub Actions Summary に出力

          # ワークフロー失敗制御（個別に制御可能）
          fail_on_large_files: "true"   # 大きなファイルが検出された場合に失敗
          fail_on_too_many_files: "true" # ファイル数超過時に失敗
          fail_on_pr_size: "large"      # PRサイズがlarge以上で失敗

          # 以下のファイルは自動的に除外されます（additional_exclude_patterns不要）:
          # - ロックファイル: package-lock.json, yarn.lock, pnpm-lock.yaml など
          # - 依存関係: node_modules/**, vendor/** など
          # - ビルド成果物: dist/**, build/**, .next/** など
          # - 最小化ファイル: *.min.js, *.min.css
          # - バイナリファイル: 画像、動画、実行ファイル
          # 完全なリストは pattern-matcher.ts を参照

          # 追加で除外したい場合は以下のように設定:
          # additional_exclude_patterns: |
          #   **/*.generated.ts
          #   **/*.gen.go
          #   coverage/**
```

### カスタム設定例

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    file_size_limit: "500KB"           # ファイルサイズ上限
    file_lines_limit: "500"            # ファイル行数上限
    pr_additions_limit: "1000"         # PR全体の追加行数上限
    pr_files_limit: "50"               # 最大ファイル数
    comment_on_pr: "auto"              # 違反時のみコメント
    fail_on_large_files: "true"        # 大きなファイルが検出された場合に失敗
    fail_on_too_many_files: "true"     # ファイル数超過時に失敗
    apply_labels: "true"               # ラベル自動適用
    skip_draft_pr: "true"              # Draft PRをスキップ
    enable_summary: "true"             # GitHub Actions Summaryに出力
```

### 🌐 多言語設定

PR Labelerは英語と日本語の出力に対応しています。GitHub Actions Summary、エラーメッセージ、ログ、PRコメントが選択した言語で表示されます。

#### 環境変数で言語を指定

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
  env:
    LANGUAGE: ja  # または 'en' (デフォルト: 'en')
```

#### 設定ファイルで言語を指定

`.github/pr-labeler.yml`:

```yaml
# 言語設定（オプション）
language: ja  # 'en' または 'ja' (デフォルト: 'en')

# カテゴリラベルの多言語表示名（オプション）
categories:
  - label: 'category/tests'
    patterns:
      - '__tests__/**'
      - '**/*.test.ts'
    display_name:
      en: 'Test Files'
      ja: 'テストファイル'

  - label: 'category/documentation'
    patterns:
      - 'docs/**'
      - '**/*.md'
    display_name:
      en: 'Documentation'
      ja: 'ドキュメント'
```

#### 言語決定の優先順位

1. `LANGUAGE` 環境変数
2. `LANG` 環境変数
3. `pr-labeler.yml` の `language` フィールド
4. デフォルト: 英語（`en`）

#### 多言語表示名の優先順位

ラベルの表示名は以下の優先順位で決定されます：

1. `.github/pr-labeler.yml` の `display_name`（カスタム翻訳）
2. 組み込みの翻訳リソース（`labels` 名前空間）
3. ラベル名そのまま

**注意**: GitHub API呼び出しでは常に英語のラベル名（`label` フィールド）が使用されます。`display_name` は表示のみに使用されます。

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

| パラメータ             | 必須 | デフォルト            | 説明                           |
| ---------------------- | ---- | --------------------- | ------------------------------ |
| `apply_labels`         | ❌   | `true`                | 自動ラベル適用の有効/無効      |
| `auto_remove_labels`   | ❌   | `true`                | 制限クリア時にラベルを自動削除 |
| `large_files_label`    | ❌   | `auto:large-files`    | ファイルサイズ/行数違反ラベル  |
| `too_many_files_label` | ❌   | `auto:too-many-files` | ファイル数超過ラベル           |

### 🆕 PR Labeler - 選択的ラベル有効化

各ラベル種別を個別に制御できます（統一された命名規則: `*_enabled` と `*_thresholds`）

| パラメータ              | 必須 | デフォルト                           | 説明                                      |
| ----------------------- | ---- | ------------------------------------ | ----------------------------------------- |
| `size_enabled`          | ❌   | `true`                               | サイズラベルの有効/無効                   |
| `size_thresholds`       | ❌   | `{"small": 100, "medium": 500, ...}` | サイズラベル閾値（JSON、additions-based） |
| `complexity_enabled`    | ❌   | `true`                               | 複雑度ラベルの有効/無効                   |
| `complexity_thresholds` | ❌   | `{"medium": 10, "high": 20}`         | 複雑度ラベル閾値（JSON）                  |
| `category_enabled`      | ❌   | `true`                               | カテゴリラベルの有効/無効                 |
| `risk_enabled`          | ❌   | `true`                               | リスクラベルの有効/無効                   |

### 動作設定

| パラメータ          | 必須 | デフォルト | 説明                                                                                                                              |
| ------------------- | ---- | ---------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `skip_draft_pr`     | ❌   | `true`     | Draft PRをスキップ                                                                                                                |
| `comment_on_pr`     | ❌   | `auto`     | コメントモード（always/auto/never）                                                                                               |
| `fail_on_violation` | ❌   | `false`    | ⚠️ **非推奨**: 違反時にアクションを失敗させる（`fail_on_large_files`、`fail_on_too_many_files`、`fail_on_pr_size`への移行を推奨） |
| `enable_summary`    | ❌   | `true`     | GitHub Actions Summaryに出力                                                                                                      |

### 🆕 ワークフロー失敗制御（Label-Based Workflow Failure Control）

ラベルまたは違反に基づいて、個別にワークフロー失敗を制御できます。

| パラメータ               | 必須 | デフォルト | 説明                                                                                                                    |
| ------------------------ | ---- | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| `fail_on_large_files`    | ❌   | `""`       | 大きなファイルが検出された場合にワークフロー失敗（`true`/`false`、空文字列で無効）                                      |
| `fail_on_too_many_files` | ❌   | `""`       | ファイル数超過が検出された場合にワークフロー失敗（`true`/`false`、空文字列で無効）                                      |
| `fail_on_pr_size`        | ❌   | `""`       | PRサイズが指定閾値以上の場合にワークフロー失敗（`"small"`/`"medium"`/`"large"`/`"xlarge"`/`"xxlarge"`、空文字列で無効） |

**使用例:**

```yaml
# パターン1: 大きなファイルのみ厳格にチェック
- uses: jey3dayo/pr-labeler@v1
  with:
    fail_on_large_files: "true"

# パターン2: ファイル数超過のみ厳格にチェック
- uses: jey3dayo/pr-labeler@v1
  with:
    fail_on_too_many_files: "true"

# パターン3: PRサイズが"large"以上で失敗
- uses: jey3dayo/pr-labeler@v1
  with:
    fail_on_pr_size: "large"
    size_enabled: "true"  # fail_on_pr_sizeにはsize_enabledが必要

# パターン4: 組み合わせ
- uses: jey3dayo/pr-labeler@v1
  with:
    fail_on_large_files: "true"
    fail_on_too_many_files: "true"
    fail_on_pr_size: "xlarge"
    size_enabled: "true"
```

**注意:**

- `fail_on_pr_size`を使用する場合、`size_enabled: "true"`が必要です
- これらの新しいinputは`fail_on_violation`より優先されます
- ラベル（`auto:large-files`など）または実際の違反のいずれかが該当すれば失敗します

### 除外設定

| パラメータ                    | 必須 | デフォルト | 説明                                       |
| ----------------------------- | ---- | ---------- | ------------------------------------------ |
| `additional_exclude_patterns` | ❌   | -          | 追加除外パターン（カンマまたは改行区切り） |

### 🆕 Directory-Based Labeling

| パラメータ                      | 必須 | デフォルト                      | 説明                                           |
| ------------------------------- | ---- | ------------------------------- | ---------------------------------------------- |
| `enable_directory_labeling`     | ❌   | `false`                         | Directory-Based Labeling機能の有効/無効        |
| `directory_labeler_config_path` | ❌   | `.github/directory-labeler.yml` | 設定ファイルパス                               |
| `auto_create_labels`            | ❌   | `false`                         | ラベル未存在時の自動作成                       |
| `label_color`                   | ❌   | `cccccc`                        | 自動作成ラベルの色（hexカラーコード、#なし）   |
| `label_description`             | ❌   | `""`                            | 自動作成ラベルの説明                           |
| `max_labels`                    | ❌   | `10`                            | 適用ラベル数の上限（0で無制限）                |
| `use_default_excludes`          | ❌   | `true`                          | デフォルト除外パターンの使用（node_modules等） |

### PR Labelerラベル閾値のデフォルト

**サイズラベル** (`size_thresholds`):

```json
{
  "small": 100,
  "medium": 500,
  "large": 1000
}
```

ラベル適用ルール:

- `size/small`: additions < 200
- `size/medium`: 200 ≤ additions < 500
- `size/large`: 500 ≤ additions < 1000
- `size/xlarge`: 1000 ≤ additions < 3000
- `size/xxlarge`: additions ≥ 3000

**複雑度ラベル** (`complexity_thresholds`):

```json
{
  "medium": 10,
  "high": 20
}
```

ラベル適用ルール:

- `complexity/medium`: 10 ≤ 最大循環的複雑度 < 20
- `complexity/high`: 最大循環的複雑度 ≥ 20

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
- uses: jey3dayo/pr-labeler@v1
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

### 違反ラベル

- `auto:large-files` - ファイルサイズまたは行数制限違反
- `auto:too-many-files` - ファイル数制限違反

### 🆕 PR Labelerラベル（新機能）

**サイズラベル**（置換ポリシー）:

- `size/small` - 追加行数 < 200行
- `size/medium` - 追加行数 200-499行
- `size/large` - 追加行数 500-999行
- `size/xlarge` - 追加行数 1000-2999行
- `size/xxlarge` - 追加行数 >= 3000行

**カテゴリラベル**（加法ポリシー - 複数付与可能）:

- `category/tests` - テストファイルの変更
- `category/ci-cd` - CI/CD設定の変更
- `category/documentation` - ドキュメント変更
- `category/config` - 設定ファイルの変更（tsconfig.json, eslint.config.js等）
- `category/spec` - 仕様書・計画ドキュメントの変更（.kiro/, spec/等）
- `category/dependencies` - 依存関係ファイルの変更（多言語対応: Node.js, Go, Python, Rust, Ruby）
- カスタムカテゴリ追加可能（YAML設定）

**リスクラベル**（置換ポリシー）:

- `risk/high` - テストなしでコア機能変更（src/\*\*）
- `risk/medium` - 設定ファイル変更

**カスタマイズ**: `.github/pr-labeler.yml`で閾値、パターン、ラベル名を変更可能（上記の設定例参照）

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

      - uses: jey3dayo/pr-labeler@v1
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
      - uses: jey3dayo/pr-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          additional_exclude_patterns: |
            **/*.generated.ts
            **/*.min.js
```

### 厳格モード

違反を許可しない厳格なチェック：

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    file_size_limit: "100KB"
    file_lines_limit: "300"
    pr_additions_limit: "500"
    fail_on_large_files: "true"
    fail_on_too_many_files: "true"
    comment_on_pr: "always"
```

### Summary出力のみ（ラベル・コメントなし）

GitHub Actions Summaryのみを使用：

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    apply_labels: "false"
    comment_on_pr: "never"
    enable_summary: "true"  # Summaryのみ出力
```

### 🆕 選択的ラベル有効化

各ラベル種別（size/complexity/category/risk）を個別にON/OFFできます。

#### デフォルト（すべて有効）

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    # すべてのラベル種別がデフォルトで有効
```

#### 複雑度ラベルのみ無効化

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    complexity_enabled: "false"  # 複雑度ラベルを無効化
    # size, category, riskラベルは有効
```

#### カスタム閾値 + 一部無効化

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    # サイズラベル: カスタム閾値で有効
    size_enabled: "true"
    size_thresholds: '{"small": 50, "medium": 200, "large": 500}'
    # 複雑度ラベル: カスタム閾値で有効
    complexity_enabled: "true"
    complexity_thresholds: '{"medium": 15, "high": 30}'
    # カテゴリラベル: 無効化
    category_enabled: "false"
    # リスクラベル: 有効（デフォルト）
```

#### サイズとリスクラベルのみ使用

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    size_enabled: "true"
    complexity_enabled: "false"
    category_enabled: "false"
    risk_enabled: "true"
```

**統一された命名規則**:

- `*_enabled`: 各ラベル種別の有効/無効を制御（デフォルト: `"true"`）
- `*_thresholds`: 各ラベル種別の閾値をJSON形式で指定

### 🆕 PR Labeler設定のカスタマイズ

`.github/pr-labeler.yml`を作成してPR Labelerの動作をカスタマイズできます：

```yaml
# .github/pr-labeler.yml
# サイズラベル設定
size:
  thresholds:
    small: 50      # 小規模PRの閾値（デフォルト: 100）
    medium: 200    # 中規模PRの閾値（デフォルト: 500）
    large: 500     # 大規模PRの閾値（デフォルト: 1000）

# カテゴリラベル設定
categories:
  - label: "category/tests"
    patterns:
      - "__tests__/**"
      - "**/*.test.ts"
      - "**/*.test.tsx"

  - label: "category/ci-cd"
    patterns:
      - ".github/workflows/**"

  - label: "category/documentation"
    patterns:
      - "docs/**"
      - "**/*.md"

  - label: "category/backend"  # カスタムカテゴリ
    patterns:
      - "src/api/**"
      - "src/services/**"

# リスク判定設定
risk:
  high_if_no_tests_for_core: true
  core_paths:
    - "src/**"
  config_files:
    - ".github/workflows/**"
    - "package.json"
    - "tsconfig.json"

# ラベル操作設定
labels:
  create_missing: true  # 存在しないラベルを自動作成
  namespace_policies:
    "size/*": replace      # サイズラベルは置換（一意性保証）
    "category/*": additive # カテゴリラベルは加法的（複数付与可能）
    "risk/*": replace      # リスクラベルは置換

# ランタイム設定
runtime:
  fail_on_error: false  # エラー時もワークフローを継続
```

**設定ファイルなしでも動作**: デフォルト設定で即座に利用可能です。

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
