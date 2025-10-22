# Product Overview - PR Labeler

## Product Description

PR Labeler（旧: PR Metrics Action）は、GitHubのPull Requestのサイズと品質を自動的にチェックし、インテリジェントなラベル付けとコメント投稿を行うGitHub Actionです。大規模なPRを早期に検出し、複雑度分析、カテゴリ分類、リスク判定により、レビュープロセスの効率化とコード品質の向上を支援します。

## Core Features

### 📏 ファイルサイズチェック

- 個別ファイルのサイズ制限を監視（KB/MB単位で設定可能）
- バイナリファイル、ビルド成果物、依存関係ファイルを自動除外
- minimatchによる柔軟な除外パターン設定

### 📝 行数制限チェック

- ファイルごとの行数上限を監視
- PR全体の追加行数（diff-based）を制限
- 変更ファイル数の上限設定

### 🏷️ 自動ラベル付け

**基本ラベリング機能**:

- PRサイズに応じた5段階ラベル（S/M/L/XL/XXL）を自動適用
- 制限違反時の警告ラベル（auto:large-files, auto:too-many-files）
- カスタマイズ可能な閾値設定（JSON形式）
- ラベルの自動削除機能（制限クリア時）

**🆕 PR Labeler機能（インテリジェントラベリング）**:

- **サイズベース**: PR追加行数に基づく4段階ラベル（size/small, size/medium, size/large, size/xlarge）
- **複雑度ベース**: ESLint標準complexityルールによる循環的複雑度分析
  - ファイル単位・関数単位の複雑度計算
  - TypeScript/JavaScript完全サポート（@typescript-eslint/parser使用）
  - GitHub Actions Summaryに詳細レポート出力（高複雑度ファイル、関数別複雑度）
  - 自動ラベル付け（complexity/medium, complexity/high）
- **カテゴリベース**: ディレクトリパターンに基づくラベル（category/tests, category/ci-cd等）
  - デフォルトカテゴリ: tests, ci-cd, documentation, config, spec, dependencies
  - 多言語依存関係サポート（Node.js, Go, Python, Rust, Ruby）
  - カスタムカテゴリをYAML設定で追加可能
- **リスクベース**: テストカバレッジとコア変更に基づくラベル（risk/high, risk/medium）
  - CI結果と変更タイプを考慮した改善されたロジック
- **選択的有効化**: 各ラベル種別（size/complexity/category/risk）を個別にON/OFF可能
  - 統一された入力命名規則: `*_enabled` と `*_thresholds`
  - デフォルトで全種別有効、柔軟なカスタマイズが可能
- **柔軟な設定**: YAML設定ファイル（.github/pr-labeler.yml）でカスタマイズ可能
- **名前空間ポリシー**: サイズ・複雑度・リスクは置換、カテゴリは加法的

**🆕 Directory-Based Labeler機能**:

- **パスベースマッピング**: ディレクトリパターン（glob）からラベルを自動決定
  - minimatchによる柔軟なパターンマッチング
  - include/excludeパターンでファイルを正確にフィルタリング
- **優先順位制御**:
  - priority値による明示的な優先順位設定
  - 最長マッチルール（具体的なパスほど優先）
  - 定義順フォールバック
- **名前空間ポリシー**:
  - exclusive（置換）: area:\* など、1つのみ適用
  - additive（加法的）: scope:\* など、複数適用可能
- **安全設計**:
  - デフォルトで無効、明示的な有効化が必要（`enable_directory_labeling: true`）
  - ラベルは自動作成される（固定値: color=cccccc, description=""）
- **設定ファイル**: `.github/directory-labeler.yml`でルール定義

### 💬 コメント投稿

- 違反内容を詳細レポートとして自動コメント
- コメントモード設定（always/auto/never）
- 違反ファイルの一覧表示（サイズ・行数・制限値）
- 冪等性保証（既存コメントの更新）

### 📊 GitHub Actions Summary出力

- ワークフローサマリーページにメトリクス表示
- 基本メトリクス（総追加行数、ファイル数、除外ファイル数）
- 違反情報の詳細テーブル
- 大規模ファイル一覧（上位100ファイル）
- 実行時刻（ISO 8601形式、UTC）

### 🎯 柔軟な設定

- 高度なパターンマッチング（minimatch）による除外設定
- Draft PRのスキップ機能
- 違反時のCI失敗設定
- 各機能の個別有効/無効化

## Target Use Cases

### 1. コードレビュー効率化

大規模なPRを早期に検出し、適切なサイズへの分割を促すことで、レビュアーの負担を軽減し、レビュー品質を向上させます。

### 2. チーム開発の品質管理

統一された基準でPRサイズを管理し、コードベースの保守性を維持します。新規メンバーにも明確なガイドラインを提供できます。

### 3. 継続的インテグレーション強化

PR品質チェックをCI/CDパイプラインに統合し、自動化されたゲートキーパーとして機能します。

### 4. オープンソースプロジェクト運営

外部コントリビューターからのPRに対して、一貫した品質基準を適用し、メンテナンスコストを削減します。

## Key Value Proposition

### 🔄 完全な冪等性

何度実行しても同じ結果を保証。既存のラベルやコメントを適切に更新し、重複を防ぎます。

### 🚀 ゼロ設定で即利用可能

デフォルト設定で多くのプロジェクトに対応。必要に応じて細かくカスタマイズも可能。

### 🛡️ セキュアなフォーク対応

`pull_request_target`イベントに対応し、フォークからのPRでも安全に動作します。

### 📈 可視性の高いレポート

GitHub Actions Summaryを活用し、CI結果ページで直感的にメトリクスを確認できます。

### 🎨 柔軟な適用範囲

除外パターンの詳細設定により、生成ファイルやロックファイルなど、チェック不要なファイルを簡単に除外できます。

## Success Metrics

- PRサイズの適正化（平均追加行数の削減）
- レビュー時間の短縮
- マージまでの期間短縮
- コードレビューのボトルネック解消
- チーム全体の開発速度向上

## Differentiation

- **neverthrowによるRailway-Oriented Programming**: エラーハンドリングの堅牢性
- **詳細な除外パターン**: デフォルトで40以上のパターンを自動除外
- **3つの出力形式**: ラベル、コメント、GitHub Actions Summaryの組み合わせ
- **TypeScript製**: 型安全性とメンテナンス性の高さ
- **包括的なテストカバレッジ**: 93%以上のカバレッジで品質を保証
