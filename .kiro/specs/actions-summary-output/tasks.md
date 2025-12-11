# Implementation Plan

## 概要

このプランは、GitHub Actions SummaryにPR分析結果を表示する機能を段階的に実装します。**Codexレビュー結果を反映**し、既存コードとの整合性を最優先にした実装計画です。

**実装方針**:

- 型名を現行コードに統一（`AnalysisResult`, `FileMetrics`）
- 既存API（`actions-io.writeSummary`）を活用してAPI重複を回避
- コメントとサマリーでMarkdown生成ロジックを共通化（`report-formatter.ts`）
- Draft PR時のSummary出力対応を追加

---

## Phase 1: 共通フォーマッタの実装とリファクタリング

- [x] 1.0 comment-manager.ts のスナップショットテスト準備（リファクタリング前）
  - `generateCommentBody()` の出力をキャプチャするスナップショットテストを追加
  - テストファイル: `__tests__/comment-manager.test.ts`
  - 実装方法: Vitestの `expect(result).toMatchSnapshot()` を使用
  - 複数のテストケース（violations有/無、大規模PR、エラーありなど）を用意
  - スナップショットファイル: `__tests__/__snapshots__/comment-manager.test.ts.snap`
  - リファクタリング後に同じスナップショットと一致することを確認する基準を設定
  - _Requirements: 6.1, 6.2_

- [x] 1. report-formatter.ts を新規作成する
- [x] 1.1 ユーティリティ関数を comment-manager.ts から抽出する
  - `formatBytes(bytes: number): string` を抽出
  - `formatNumber(num: number): string` を抽出
  - 既存テストを `report-formatter.test.ts` に移植
  - _Requirements: 4.3_

- [x] 1.2 基本メトリクス整形関数を実装する
  - `formatBasicMetrics(metrics: AnalysisResult['metrics'], options?): string` を実装
  - PR総追加行数、総ファイル数、分析済みファイル数を表示
  - マークダウン見出しとアイコンを使用して構造化
  - オプション引数でヘッダーの有無を制御可能に
  - _Requirements: 1.1, 1.2, 4.1, 4.3_

- [x] 1.3 違反情報整形関数を実装する
  - `formatViolations(violations: AnalysisResult['violations'], options?): string` を実装
  - ファイルサイズ違反、行数違反をテーブル形式で表示
  - PR追加行数超過、ファイル数超過を表示
  - 違反なしの場合の成功メッセージを実装
  - 警告アイコン（⚠️）と成功アイコン（✅）を使用
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.2, 4.4, 4.5_

- [x] 1.4 ファイル詳細整形関数を実装する
  - `formatFileDetails(files: FileMetrics[], limit?: number): string` を実装
  - ファイルパス、追加行数、削除行数、サイズをテーブル形式で表示
  - limit引数で表示ファイル数を制限（デフォルト: 無制限）
  - 大規模PR（100+ファイル）での要約表示を実装
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.3_

- [x] 1.5 Markdownエスケープ処理を実装する
  - `escapeMarkdown(text: string): string` を実装
  - 特殊文字を含むファイル名の安全な表示
  - Markdownインジェクション対策
  - _Requirements: 4.6_

- [x] 1.6 report-formatter.ts のユニットテストを実装する
  - formatBytes, formatNumber のテスト（既存テストを移植）
  - formatBasicMetrics のテスト
  - formatViolations のテスト（違反あり/なし両方）
  - formatFileDetails のテスト（limit機能含む）
  - escapeMarkdown のテスト
  - エッジケース: 空配列、大量ファイル、特殊文字
  - 純粋関数の動作検証（同じ入力で同じ出力）
  - _Requirements: 1.1-1.5, 2.1-2.5, 3.1-3.6, 4.1-4.6_

- [x] 2. comment-manager.ts をリファクタリングする
- [x] 2.1 generateCommentBody を report-formatter を使用するように書き換える
  - `formatBytes`, `formatNumber` を report-formatter からインポート
  - 共通化できる部分（メトリクス、違反、ファイル詳細）を report-formatter の関数で置き換え
  - コメント特有のヘッダー/フッター/署名のみを残す
  - _Requirements: 6.1, 6.2_

- [x] 2.2 comment-manager.ts のリファクタリング検証テストを実行する
  - 既存のすべてのテストが通ることを確認
  - マークダウン生成結果が以前と同じことを確認（スナップショットテスト推奨）
  - _Requirements: 6.1, 6.2, 6.3_

---

## Phase 2: 入力設定とSummary出力機能の実装

- [x] 3. action.yml に enable_summary パラメータを追加する
- [x] 3.1 enable_summary 入力定義を追加する
  - `action.yml` の `inputs` セクションに追加
  - description: "Write PR metrics to GitHub Actions Summary"
  - default: "true"
  - required: false
  - _Requirements: 7.1, 7.4_

- [x] 4. actions-io.ts を拡張する
- [x] 4.1 ActionInputs インターフェースに enable_summary を追加する
  - `enable_summary: string` フィールドを追加
  - _Requirements: 7.1_

- [x] 4.2 getActionInputs 関数を拡張する
  - `enable_summary: core.getInput('enable_summary') || 'true'` を追加
  - デフォルト値 "true" を設定
  - _Requirements: 7.1, 7.4_

- [x] 4.3 SummaryWriteResult インターフェースを定義する
  - `action: 'written' | 'skipped'` を定義
  - `bytesWritten?: number` を定義（オプショナル）
  - _Requirements: 5.1_

- [x] 4.4 writeSummaryWithAnalysis 関数を実装する
  - `writeSummaryWithAnalysis(analysis: AnalysisResult, config: { enableSummary: boolean }): Promise<Result<SummaryWriteResult, Error>>` を実装
  - config.enableSummary === false の場合: ok({ action: 'skipped' }) を返す
  - config.enableSummary === true の場合:
    - report-formatter の関数を使用してマークダウンを生成
    - 既存の `writeSummary(markdown)` を呼び出す
    - summary.write() 成功時: ok({ action: 'written', bytesWritten }) を返す
    - summary.write() 失敗時: logWarning でエラーログ出力し、err(error) を返す
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 7.2_

- [x] 4.5 actions-io.ts のユニットテストを実装する
  - `getActionInputs()` の enable_summary フィールドテスト
  - `writeSummaryWithAnalysis()` の enableSummary=true/false 動作テスト
  - @actions/core.summary のモック化テスト
  - summary.write() 成功時のテスト
  - summary.write() 失敗時のエラーハンドリングテスト
  - Result型の正しい使用検証（ok/errパターン）
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 7.1, 7.2, 7.4_

- [x] 5. input-mapper.ts を拡張する
- [x] 5.1 Config インターフェースに enableSummary を追加する
  - `enableSummary: boolean` フィールドを追加
  - _Requirements: 7.1_

- [x] 5.2 mapActionInputsToConfig 関数を拡張する
  - `enableSummary: parseBoolean(inputs.enable_summary)` を追加
  - _Requirements: 7.1, 7.4_

- [x] 5.3 input-mapper.ts のユニットテストを実装する
  - enableSummary フィールドのマッピングテスト
  - parseBoolean による true/false 変換テスト
  - _Requirements: 7.1, 7.4_

---

## Phase 3: メインフロー統合とテスト

- [x] 6. index.ts のrunメソッドにSummary出力ステップを追加する
- [x] 6.1 Draft PR時のSummary出力を実装する
  - `src/index.ts:54-58` の Draft 早期 return 前に実装
  - `if (config.enableSummary)` で条件分岐
  - `await writeSummary('## ⏭️ Draft PR Skipped\n\nDraft PRのため分析をスキップしました。')` を呼び出す
  - _Requirements: 1.5_

- [x] 6.2 分析後のSummary出力を実装する
  - `src/index.ts:190` のコメント管理ステップの後に実装
  - `if (config.enableSummary)` で条件分岐
  - `logInfo('📊 Writing GitHub Actions Summary...')` でログ出力
  - `const summaryResult = await writeSummaryWithAnalysis(analysis, config)` を呼び出す
  - `if (summaryResult.isErr())` でエラーハンドリング（logWarning のみ、継続実行）
  - _Requirements: 5.1, 5.2, 6.1, 6.2, 6.3, 7.2_

- [x] 7. 統合テストを実装する
- [x] 7.1 run() → writeSummaryWithAnalysis() 統合テストを実装する
  - 分析結果からSummary出力までのエンドツーエンドテスト
  - enableSummary 設定による動作切り替えテスト
  - Draft PR時のSummary出力テスト
  - Summary出力エラー発生時の既存機能継続テスト
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 7.2 report-formatter と comment-manager の統合テストを実装する
  - リファクタリング後のコメント生成が正常動作することを確認
  - 既存のコメント統合テストがすべて通ることを確認
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 7.3 @actions/core.summary API 統合テストを実装する
  - 実際の summary API を使用した統合テスト（可能な場合）
  - 生成されたマークダウンの妥当性検証テスト
  - GitHub Flavored Markdown 仕様準拠テスト
  - _Requirements: 5.1, 5.2, 5.4_

- [x] 7.4 既存機能との並行実行テストを実装する
  - Summary出力が既存のlabel/comment機能に干渉しないことを確認
  - failOnViolation 設定との組み合わせテスト
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8. ドキュメントとリリース準備
- [x] 8.1 README.md を更新する
  - `enable_summary` パラメータの説明を追加
  - 使用例を追加
  - _Requirements: All requirements_

- [x] 8.2 リリースノートを作成する
  - CHANGELOG.md を作成（v1.0.0 初回リリース）
  - docs/ja/release-process.md を整備（リリース手順書、正典）
  - 新機能の説明（GitHub Actions Summary 出力）
  - 既存機能への影響なしを明記
  - マイグレーションガイド（デフォルト有効、無効化方法）
  - _Requirements: All requirements_

- [x] 8.3 検証チェックリストを確認する
  - [x] 既存のlabel/comment機能が正常動作する
  - [x] fail_on_violation設定が正しく動作する
  - [x] enable_summary=falseで出力がスキップされる
  - [x] エラー発生時に適切なログが出力される
  - [x] Draft PR時にスキップメッセージが表示される
  - [x] すべてのユニットテストが通る (229 passed)
  - [x] すべての統合テストが通る (229 passed)
  - [x] 型エラー 0 件
  - [x] リント違反 0 件
  - [x] comment-manager.tsのスナップショットテストが通る

---

## タスク要約

### Phase 1: 共通フォーマッタ (Tasks 1.0-2)

- スナップショットテスト準備
- report-formatter.ts 新規作成
- comment-manager.ts リファクタリング
- ユニットテスト

### Phase 2: Summary機能 (Tasks 3-5)

- action.yml 拡張
- actions-io.ts 拡張
- input-mapper.ts 拡張
- ユニットテスト

### Phase 3: 統合とテスト (Tasks 6-8)

- index.ts 統合
- 統合テスト
- ドキュメント更新

---

## 要件トレーサビリティ

| Task | 対応要件 |
| ------- | --------------------------------------- |
| 1.0 | 6.1, 6.2 |
| 1.1-1.5 | 4.3, 1.1-1.2, 2.1-2.5, 3.1-3.6, 4.1-4.6 |
| 2.1-2.2 | 6.1-6.3 |
| 3.1 | 7.1, 7.4 |
| 4.1-4.5 | 5.1-5.4, 7.1-7.4 |
| 5.1-5.3 | 7.1, 7.4 |
| 6.1-6.2 | 1.5, 5.1-5.2, 6.1-6.3, 7.2 |
| 7.1-7.4 | 5.1-5.4, 6.1-6.5 |
| 8.1-8.3 | All requirements |
