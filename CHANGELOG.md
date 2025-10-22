# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - TBD

### Documentation

#### 📚 README簡素化 (README Simplification)

README.mdを717行から206行に簡素化し、詳細情報を`docs/`ディレクトリに分離しました。

**変更内容**:

- **README.md簡素化**: 730行 → 206行（目標200-300行達成）
- **README.ja.md追加**: 日本語版READMEを同時リリース
- **詳細ドキュメント作成**:
  - `docs/configuration.md`: 全入力パラメータ、出力変数、デフォルト値（440行）
  - `docs/advanced-usage.md`: 実践的な使用例と高度な設定（670行）
  - `docs/troubleshooting.md`: よくある問題と解決策（527行）
- **アンカー互換性維持**: 既存のアンカーリンク（日本語・英語・GitHubスラッグ対応）を保持
- **移行通知**: README冒頭に移行通知とアーカイブリンク追加
- **ドキュメント同期ガイドライン**: `docs/documentation-guidelines.md`に多言語同期手順を追加

**アーカイブ**:

以前のREADME（730行）は[pre-simplification-readme](https://github.com/jey3dayo/pr-labeler/tree/pre-simplification-readme)タグで参照可能です。

**関連Issue**: #35

### BREAKING CHANGES

#### 🔧 入力パラメータ簡素化 (Simplify Label Inputs)

冗長な`apply_labels`パラメータを削除し、複雑度分析機能をデフォルトOFFに変更しました。

**削除されたinputs**:

- `apply_labels` - 個別の`*_enabled`パラメータで代替

**変更されたデフォルト値**:

- `complexity_enabled`: `"true"` → `"false"` (オプトイン機能に変更)
- `complexity_thresholds`: `'{"medium": 10, "high": 20}'` → `'{"medium": 15, "high": 30}'` (より実用的な閾値に緩和)

**移行ガイド**:

既存ユーザーが`apply_labels: "false"`を使用していた場合:

```yaml
# 旧設定
apply_labels: "false"

# 新設定（すべてのラベルを無効化）
size_enabled: "false"
complexity_enabled: "false"
category_enabled: "false"
risk_enabled: "false"
```

複雑度分析を継続利用する場合:

```yaml
# 明示的に有効化が必要
complexity_enabled: "true"
```

複雑度閾値をカスタマイズしていた場合:

```yaml
# 旧デフォルト値を維持する場合
complexity_thresholds: '{"medium": 10, "high": 20}'
```

### Added

#### 🆕 ラベルベース・ワークフロー失敗制御機能（Label-Based Workflow Failure Control）

ラベルまたは違反に基づいて、個別にワークフロー失敗を制御できる新機能を追加。

**新規inputs**:

- `fail_on_large_files` - 大きなファイル（`auto:large-files`ラベルまたは違反）が検出された場合にワークフロー失敗（デフォルト: `""`）
- `fail_on_too_many_files` - ファイル数超過（`auto:too-many-files`ラベルまたは違反）が検出された場合にワークフロー失敗（デフォルト: `""`）
- `fail_on_pr_size` - PRサイズが指定閾値以上の場合にワークフロー失敗（デフォルト: `""`）
  - 有効値: `"small"` | `"medium"` | `"large"` | `"xlarge"` | `"xxlarge"`
  - `size_enabled: "true"`が必要

**主な特徴**:

- ラベル（例: `auto:large-files`）または実際の違反のいずれかが該当すれば失敗
- 各失敗条件を個別に有効/無効化可能
- 多言語対応（日本語・英語）の失敗メッセージ

**使用例**:

```yaml
# 大きなファイルのみ厳格にチェック
fail_on_large_files: "true"

# PRサイズがlarge以上で失敗
fail_on_pr_size: "large"
size_enabled: "true"

# 組み合わせ
fail_on_large_files: "true"
fail_on_too_many_files: "true"
fail_on_pr_size: "xlarge"
```

#### 🆕 選択的ラベル有効化機能

各ラベル種別（size/complexity/category/risk）を個別にON/OFF可能にする統一インターフェースを追加 (#25)。

**新規inputs（統一された命名規則）**:

- `size_enabled` - サイズラベルの有効/無効（デフォルト: `"true"`）
- `size_thresholds` - サイズラベル閾値（JSON形式: `{"small": 100, "medium": 500, "large": 1000}`）
- `complexity_enabled` - 複雑度ラベルの有効/無効（デフォルト: `"true"`）
- `complexity_thresholds` - 複雑度ラベル閾値（JSON形式: `{"medium": 10, "high": 20}`）
- `category_enabled` - カテゴリラベルの有効/無効（デフォルト: `"true"`）
- `risk_enabled` - リスクラベルの有効/無効（デフォルト: `"true"`）

**統一された命名規則**:

- すべてのラベル種別で `*_enabled` と `*_thresholds` の一貫したパターンを採用
- より直感的で学習しやすいAPI設計

**GitHub Actions Summary拡張**:

- 無効化されたラベル種別の情報をSummaryに表示
- デバッグとトラブルシューティングの容易性向上

#### 🆕 PR Labeler - インテリジェント自動ラベル付け機能

PRメトリクス分析に基づいた高度な自動ラベル付け機能を追加。従来のサイズラベル（S/M/L/XL/XXL）に加え、複数のディメンションでPRを分類します。

**サイズベースラベル**:

- `size/small` - 追加行数 < 100行
- `size/medium` - 追加行数 100-500行
- `size/large` - 追加行数 500-1000行
- `size/xlarge` - 追加行数 >= 1000行
- 既存のsize/\*ラベルを自動置換（一意性保証）

**カテゴリベースラベル**:

- `category/tests` - テストファイルの変更（`__tests__/**`, `**/*.test.ts`）
- `category/ci-cd` - CI/CD設定の変更（`.github/workflows/**`）
- `category/documentation` - ドキュメント変更（`docs/**`, `**/*.md`）
- `category/config` - 設定ファイルの変更（`**/tsconfig.json`, `**/eslint.config.*`, `**/mise.toml`等）
- `category/spec` - 仕様書・計画ドキュメントの変更（`.kiro/**`, `spec/**`等）
- `category/dependencies` - 依存関係ファイルの変更（`**/package.json`, `**/go.mod`, `**/Cargo.toml`等、多言語対応）
- minimatchパターンマッチングでカスタマイズ可能
- 任意階層対応（`**/`プレフィックス）でmonorepo構成もサポート
- 複数カテゴリ同時付与（加法ポリシー）

**リスクベースラベル**:

- `risk/high` - テストなしでコア機能変更（`src/**`）
- `risk/medium` - 設定ファイル変更（`package.json`, `tsconfig.json`, `.github/workflows/**`）
- レビュー優先度の可視化

**設定の柔軟性**:

- `.github/pr-labeler.yml`でカスタマイズ可能
- 閾値、パターン、ラベル名をプロジェクト固有に調整
- デフォルト設定でゼロ設定で即利用可能

**技術実装**:

- Railway-Oriented Programming（neverthrow）による堅牢なエラーハンドリング
- 冪等性保証（同じPR状態で再実行しても同じラベル）
- 権限不足時の適切な処理（フォークPR対応）
- レート制限対応（指数バックオフリトライ）
- 新規依存関係: `js-yaml` 4.1.0（YAML設定パース）

**テストカバレッジ**: 90.17%（282テスト成功）

#### 新規モジュール

- `src/labeler-types.ts` - PR Labeler用の型定義とデフォルト設定
- `src/config-loader.ts` - YAML設定の読み込みとバリデーション
- `src/label-decision-engine.ts` - サイズ、カテゴリ、リスクのラベル判定ロジック
- `src/label-applicator.ts` - 冪等性を保証したラベル適用

### Changed

- `src/index.ts` - PR Labeler機能を既存フローに統合
- `src/index.ts` - Step 10の失敗判定ロジックを`evaluateFailureConditions`ベースに置き換え

### Note

**複雑度ベースラベル（complexity/medium, complexity/high）は将来拡張として v1.2.0 で実装予定**

## [1.0.1] - 2025-10-19

### Fixed

- **CI環境でのビルド検証失敗を修正** (#9)
  - TypeScript `declarationMap` を無効化して環境依存パスを削除
  - `.d.ts.map` ファイル (24個) を削除し、環境固有の絶対パスが埋め込まれる問題を解決
  - CIワークフローの差分チェックで環境依存ファイル (`*.map`, `*.d.ts`, `*.d.ts.map`) を除外
  - ローカルとCI環境でビルド結果が一致するように修正

### Technical Details

- `tsconfig.json` から `declarationMap: true` を削除
- `.github/workflows/quality.yml` の "Verify dist/ Build" ステップを改善
- 非決定的なビルド成果物を差分チェックから除外する保護策を追加

## [1.0.0] - 2025-10-18

### Added

#### Core Features

- **ファイルサイズチェック**: 個別ファイルのサイズ制限を監視
- **行数制限チェック**: ファイルごと・PR全体の行数を制限
- **自動ラベル付け**: PRサイズに応じたラベル（S/M/L/XL/XXL）を自動適用
- **コメント投稿**: 違反内容を詳細レポートとして自動コメント
- **GitHub Actions Summary出力**: ワークフローサマリーページにメトリクスを表示
  - 基本メトリクス（総追加行数、ファイル数、実行時刻）
  - 違反情報の詳細テーブル
  - ファイル詳細一覧（上位100件）
  - `enable_summary` パラメータで有効/無効を制御（デフォルト: true）

#### Technical Features

- **柔軟な除外パターン**: minimatchによる高度なファイル除外設定
- **型安全なエラーハンドリング**: neverthrowの`Result<T, E>`パターン採用
- **冪等性**: 何度実行しても同じ結果を保証
- **Draft PRスキップ**: Draft PRを自動的にスキップ可能

#### Configuration

- カスタマイズ可能な制限値（ファイルサイズ、行数、PR追加行数、ファイル数）
- コメントモード設定（always/auto/never）
- ラベル自動削除設定

### Technical Details

- TypeScript 5.0+ strict mode
- Node.js 20+ 対応
- 完全なテストカバレッジ（93%+）
- @actions/core Summary API統合

---

[1.0.1]: https://github.com/jey3dayo/pr-labeler/releases/tag/v1.0.1
[1.0.0]: https://github.com/jey3dayo/pr-labeler/releases/tag/v1.0.0
