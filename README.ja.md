# PR Labeler

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
![Test Coverage](https://img.shields.io/badge/Coverage-93%25-green.svg)

PRのサイズ、カテゴリ、リスクを自動的に判定してラベル付けするGitHub Actionです。

🇯🇵 [日本語](README.ja.md) | 🇬🇧 [English](README.md)

## 🚀 主要機能

- **📏 自動PRラベル付け**: PR追加行数に基づいてサイズラベル（small/medium/large/xlarge/xxlarge）を自動適用
- **🏷️ 柔軟なカテゴリ分類**: PRをタイプ別に自動分類（テスト、ドキュメント、CI/CD、依存関係など）
- **📁 ディレクトリベースラベル**: 変更ファイルパスに基づいてGlobパターンでラベル適用
- **⚠️ リスク評価**: 高リスクな変更を識別（テストなしのコア変更）
- **🌐 多言語サポート**: サマリー、コメント、ログの英語・日本語出力

## 📋 クイックスタート

<a id="使用方法"></a>
<a id="-使用方法"></a>
<a id="usage"></a>

### 最小構成

`.github/workflows/pr-check.yml` に以下のワークフローを追加：

```yaml
name: PR Size Check

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  check:
    runs-on: ubuntu-latest

    permissions:
      contents: read        # ファイル読み取り
      pull-requests: write  # ラベル管理
      issues: write         # コメント投稿

    steps:
      - uses: actions/checkout@v4

      - uses: jey3dayo/pr-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

これにより、PRサイズ（例: `size/small`, `size/large`）、カテゴリ（例: `category/tests`, `category/docs`）、リスクレベル（例: `risk/high`）に基づいてラベルが自動的に適用されます。

### 次のステップ

- 📖 **パラメータ設定**: 全入力オプションは [設定ガイド](docs/configuration.md) を参照
- 🚀 **高度なシナリオ**: フォークPR、条件付き実行などは [高度な使用例](docs/advanced-usage.md) を参照

## 🔒 必要な権限

<a id="必要な権限"></a>
<a id="-必要な権限"></a>
<a id="permissions"></a>

このアクションには以下の権限が必要です：

```yaml
permissions:
  pull-requests: write  # ラベル管理
  issues: write         # コメント投稿
  contents: read        # ファイル読み取り
```

**注意**: フォークからのPRには `pull_request_target` イベントを使用してください。詳細は [高度な使用例 - フォークPR対応](docs/advanced-usage.md#fork-pr-handling) を参照。

## 🏷️ 自動適用ラベル

<a id="自動適用ラベル"></a>
<a id="-自動適用ラベル"></a>
<a id="labels"></a>

### サイズラベル

PR全体の追加行数に基づいて適用：

- `size/small` - 200行未満
- `size/medium` - 200-499行
- `size/large` - 500-999行
- `size/xlarge` - 1000-2999行
- `size/xxlarge` - 3000行以上

### カテゴリラベル

変更ファイルパターンに基づいて適用：

- `category/tests` - テストファイルの変更
- `category/ci-cd` - CI/CD設定
- `category/documentation` - ドキュメント変更
- `category/config` - 設定ファイル
- `category/spec` - 仕様書ドキュメント
- `category/dependencies` - 依存関係ファイル（Node.js、Go、Python、Rust、Ruby）

### リスクラベル

変更リスクに基づいて適用：

- `risk/high` - テストなしのコア変更
- `risk/medium` - 設定ファイルの変更

### 違反ラベル

制限超過時に適用：

- `auto:large-files` - ファイルサイズ/行数制限違反
- `auto:too-many-files` - ファイル数超過

**カスタマイズ**: 閾値とラベルの調整は [設定ガイド](docs/configuration.md#label-thresholds-defaults) を参照。

## 🔧 入力パラメータ

<a id="入力パラメータ"></a>
<a id="-入力パラメータ"></a>
<a id="input-parameters"></a>

詳細なパラメータドキュメントは **[設定ガイド](docs/configuration.md)** を参照してください。

**クイックリファレンス**:

- **基本制限**: `file_size_limit`, `file_lines_limit`, `pr_additions_limit`, `pr_files_limit`
- **ラベル制御**: `size_enabled`, `complexity_enabled`, `category_enabled`, `risk_enabled`
- **ワークフロー失敗**: `fail_on_large_files`, `fail_on_too_many_files`, `fail_on_pr_size`
- **ディレクトリラベル**: `enable_directory_labeling`
- **多言語**: `language` (en/ja)

## 📝 高度な使用例

<a id="高度な使用例"></a>
<a id="-高度な使用例"></a>
<a id="advanced-usage"></a>

実践的な例と高度な設定は **[高度な使用例ガイド](docs/advanced-usage.md)** を参照してください。

**一般的なシナリオ**:

- [フォークPR対応](docs/advanced-usage.md#fork-pr-handling) - `pull_request_target` 設定
- [条件付き実行](docs/advanced-usage.md#conditional-execution) - ラベル/ブランチ/パスでスキップ
- [厳格モード](docs/advanced-usage.md#strict-mode) - 違反時にワークフロー失敗
- [選択的ラベル有効化](docs/advanced-usage.md#selective-label-enabling) - ラベル種別を個別に有効/無効化
- [ディレクトリベースラベル](docs/advanced-usage.md#directory-based-labeling) - ファイルパスパターンでラベル適用
- [多言語サポート](docs/advanced-usage.md#multi-language-support) - 日本語/英語出力

## 📚 ドキュメント

- **[設定ガイド](docs/configuration.md)** - 全入力パラメータ、出力変数、デフォルト値
- **[高度な使用例ガイド](docs/advanced-usage.md)** - 実践的な例と高度なシナリオ
- **[トラブルシューティングガイド](docs/troubleshooting.md)** - よくある問題と解決策
- **[APIドキュメント](docs/API.md)** - 内部APIリファレンス
- **[リリースプロセス](docs/release-process.md)** - 新バージョンのリリース方法

## 🤝 コントリビューション

コントリビューションを歓迎します！大きな変更の場合は、まずissueを開いて変更内容を議論してください。

テストが通ることと、既存のコードスタイルに従うことを確認してください。

## 📄 ライセンス

MIT

## 🙏 謝辞

このプロジェクトは以下のライブラリを使用しています：

- [neverthrow](https://github.com/supermacro/neverthrow) - Railway-Oriented Programming
- [minimatch](https://github.com/isaacs/minimatch) - パターンマッチング
- [bytes](https://github.com/visionmedia/bytes.js) - サイズ解析
- [@actions/core](https://github.com/actions/toolkit) - GitHub Actions統合
- [@actions/github](https://github.com/actions/toolkit) - GitHub API
