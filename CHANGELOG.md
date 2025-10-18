# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
