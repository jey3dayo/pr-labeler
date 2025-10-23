# PR Labeler

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
![Test Coverage](https://img.shields.io/badge/Coverage-93%25-green.svg)

**GitHub Actions用のインテリジェントなPR分析・ラベリングツール** - プルリクエストを自動的に分類、サイズ判定、リスク評価します。

🇯🇵 [日本語](README.ja.md) | 🇬🇧 [English](README.md)

## ✨ PR Labelerを選ぶ理由

インテリジェントな自動化でPRレビュープロセスを効率化:

- **📏 スマートなサイズ検出**: PRサイズ（small → xxlarge）を自動ラベリングし、レビュー優先度の判断をサポート
- **🏷️ 自動カテゴリ分類**: 変更タイプ（テスト、ドキュメント、CI/CD、依存関係）を自動判定し、素早いフィルタリングを実現
- **⚠️ リスク評価**: テストなしのコア変更を事前に検出し、マージ前に警告
- **📁 パスベースラベル**: 柔軟なGlobパターンでファイルパスに基づくカスタムラベルを適用
- **🚦 品質ゲート**: 大きすぎるPRやポリシー違反時にワークフローを失敗させるオプション機能
- **🌐 多言語対応**: 英語・日本語の完全サポート

## 🚀 クイックスタート

2分で導入完了:

### 1. ワークフローファイルを作成

`.github/workflows/pr-labeler.yml` を追加:

```yaml
name: PR Labeler

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  label:
    runs-on: ubuntu-latest

    permissions:
      contents: read        # PRファイル読み取り
      pull-requests: write  # ラベル適用
      issues: write         # コメント投稿

    steps:
      - uses: actions/checkout@v4
      - uses: jey3dayo/pr-labeler@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

### 2. 自動適用されるラベル

設定後、すべてのPRに自動的に以下が付与されます:

- **サイズラベル**: `size/small`, `size/medium`, `size/large`, `size/xlarge`, `size/xxlarge`
- **カテゴリラベル**: `category/tests`, `category/docs`, `category/ci-cd`, `category/dependencies` など
- **リスクラベル**: `risk/high`, `risk/medium`（該当時）

### 3. カスタマイズ（オプション）

さらに詳細な制御が必要な場合:

- 📖 [設定ガイド](docs/configuration.md) - 全入力パラメータと閾値設定
- 🔧 [高度な使用例](docs/advanced-usage.md) - フォークPR、厳格モード、カスタムワークフロー

## 🔒 権限設定

必要なGitHub Actions権限:

```yaml
permissions:
  contents: read        # PRファイル読み取り
  pull-requests: write  # ラベル適用・削除
  issues: write         # PRコメント投稿
```

**フォークPR**: `pull_request_target` イベントを使用してください。詳細は [フォークPR対応](docs/advanced-usage.md#fork-pr-handling) を参照。

## 🏷️ 適用されるラベル

### サイズラベル（追加行数ベース）

| ラベル         | 追加行数  | 用途             |
| -------------- | --------- | ---------------- |
| `size/small`   | < 200     | クイックレビュー |
| `size/medium`  | 200-499   | 通常レビュー     |
| `size/large`   | 500-999   | 集中が必要       |
| `size/xlarge`  | 1000-2999 | 分割推奨         |
| `size/xxlarge` | ≥ 3000    | 分割すべき       |

### カテゴリラベル

変更タイプを自動検出:

| ラベル                   | マッチ対象     | 例                     |
| ------------------------ | -------------- | ---------------------- |
| `category/tests`         | テストファイル | `**/*.test.ts`         |
| `category/ci-cd`         | CI/CD設定      | `.github/workflows/**` |
| `category/documentation` | ドキュメント   | `docs/**`, `*.md`      |
| `category/config`        | 設定ファイル   | `*.config.js`, `.env`  |
| `category/spec`          | 仕様書         | `.kiro/specs/**`       |
| `category/dependencies`  | ロックファイル | `package-lock.json`    |

### リスクラベル

潜在的な問題を警告:

- `risk/high` - テスト更新を伴わないコア変更
- `risk/medium` - 設定やインフラの変更

### 違反ラベル

制限超過時:

- `auto/large-files` - 個別ファイルが大きすぎる
- `auto/too-many-files` - 変更ファイル数が多すぎる

**カスタマイズ**: すべての閾値とラベルは設定可能。詳細は [設定ガイド](docs/configuration.md#label-thresholds-defaults) を参照。

## ⚙️ 設定

### 主要オプション

```yaml
- uses: jey3dayo/pr-labeler@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}

    # サイズ制限
    file_size_limit: "100KB"      # 最大ファイルサイズ
    file_lines_limit: "500"       # 最大行数/ファイル
    pr_additions_limit: "5000"    # 最大追加行数合計
    pr_files_limit: "50"          # 最大変更ファイル数

    # ラベル制御
    size_enabled: "true"          # サイズラベル有効化
    category_enabled: "true"      # カテゴリラベル有効化
    risk_enabled: "true"          # リスクラベル有効化
    complexity_enabled: "false"   # 複雑度ラベル（デフォルトOFF）

    # 品質ゲート
    fail_on_pr_size: "xlarge"     # PRが大きすぎる場合に失敗
    fail_on_large_files: "true"   # ファイルが制限超過時に失敗

    # ローカライズ
    language: "ja"                # 出力言語（en/ja）
```

### 高度な機能

- **ディレクトリベースラベル**: ファイルパスパターンでカスタムラベルを適用
- **フォークPRサポート**: `pull_request_target` で安全に処理
- **条件付き実行**: ラベル、ブランチ、パスでチェックをスキップ
- **カスタム閾値**: すべてのサイズ・複雑度の制限を微調整

👉 **完全なドキュメント**: [設定ガイド](docs/configuration.md) | [高度な使用例](docs/advanced-usage.md)

## 📚 ドキュメント

| ガイド                                            | 説明                       |
| ------------------------------------------------- | -------------------------- |
| [設定ガイド](docs/configuration.md)               | 全入力・出力・デフォルト値 |
| [高度な使用例](docs/advanced-usage.md)            | 実践的な例とパターン       |
| [トラブルシューティング](docs/troubleshooting.md) | よくある問題と解決策       |
| [APIリファレンス](docs/API.md)                    | 内部APIドキュメント        |
| [リリースプロセス](docs/release-process.md)       | バージョン管理             |

## 🤝 コントリビューション

コントリビューション歓迎！以下をお願いします:

1. 大きな変更の場合はissueを開く
2. すべてのテストが成功することを確認
3. 既存のコードスタイルに従う

## 📄 ライセンス

MIT License - 詳細はリポジトリを参照してください。

## 🙏 使用ライブラリ

- [neverthrow](https://github.com/supermacro/neverthrow) - 型安全なエラーハンドリング
- [minimatch](https://github.com/isaacs/minimatch) - Globパターンマッチング
- [bytes](https://github.com/visionmedia/bytes.js) - サイズ解析ユーティリティ
- [@actions/toolkit](https://github.com/actions/toolkit) - GitHub Actions SDK
