# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - TBD

### Added

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
- `category/components` - コンポーネント変更（`src/components/**`）
- minimatchパターンマッチングでカスタマイズ可能
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
- `src/errors.ts` - ComplexityAnalysisError型を追加

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
- 違反時のCI失敗制御（`fail_on_violation`）
- ラベル自動削除設定

### Technical Details

- TypeScript 5.0+ strict mode
- Node.js 20+ 対応
- 完全なテストカバレッジ（93%+）
- @actions/core Summary API統合

---

[1.0.1]: https://github.com/jey3dayo/pr-metrics-action/releases/tag/v1.0.1
[1.0.0]: https://github.com/jey3dayo/pr-metrics-action/releases/tag/v1.0.0
