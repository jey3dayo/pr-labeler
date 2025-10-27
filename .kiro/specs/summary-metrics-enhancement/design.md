# Design Document

Language: ja

## Introduction

Summary 出力に、総変更ファイル数と解析対象ファイル数を明示する行と、除外ファイル一覧を折りたたみ表示する仕組み、さらに適用済みラベル一覧を表示するセクションを追加する。既存のコメント生成ロジックや i18n リソースを再利用しつつ、Summary のみを拡張する。

## Architecture

- Summary 表示は `summary/summary-writer.ts` で構築されるため、同ファイルおよび `summary/formatters/basic-metrics.ts` 等の formatter を拡張する。
- 除外ファイルの `<details>` ブロックを新たな formatter 関数として `summary/formatters` 配下に追加し、Summary でのみ使用する。
- 適用ラベルセクションは既存のコメント表示ロジック（`report-formatter.formatImprovementActions` 等）から再利用可能な処理がないか確認し、必要であれば Summary 専用の formatter を実装する。
- i18n は `locales/en/summary.json`, `locales/ja/summary.json` を更新。ログ系 namespace への影響があれば対応する。
- コメント出力は `report-formatter.ts` を介しているため、Summary 専用のフォーマットがコメントに影響しないよう呼び出しを分岐させる。

## Components

1. Summary 用 Basic Metrics フォーマッタ
   - Summary 専用 `formatSummaryBasicMetrics` を実装し、総変更ファイル数／解析対象ファイル数の行を出力。
   - コメント用 `formatBasicMetrics` は従来の表示を維持する。
2. `formatExcludedFiles`（新規）
   - 引数: 除外ファイル配列、翻訳キー。
   - `<details><summary>` にラベル + 件数、本文に `-` リストを出力。
3. `formatAppliedLabels`（新規）
   - 引数: ラベル配列、翻訳キー。
   - ラベルが存在すれば見出し＋インラインリスト、存在しなければ空文字または「No labels applied」を返却。
   - コメント出力のラベル表示 (`formatImprovementActions` とは独立) と整合を取り、重複表示にならないようにする。
4. `buildSummaryMarkdown`
   - Summary 用 Basic Metrics・`formatExcludedFiles`・`formatAppliedLabels` を組み合わせてセクションを構築。
5. テスト・スナップショット
   - `report-formatter.test.ts`: Summary 用フォーマッタとコメント用フォーマッタ双方のスナップショットを更新。
   - `summary-writer.test.ts`: 新行・除外一覧・ラベルセクションを検証。
   - `comment-manager.test.ts`: コメント側スナップショットが想定通り更新（または非更新）であることを確認。
   - 多言語 (en/ja) の出力をカバーする。
6. i18n 更新
   - `Files Analyzed`, `解析対象ファイル数`, `Applied Labels`, `No labels applied` 等のキーを追加。
   - `<details>` summary 文言の翻訳を追加。

## Data Flow

1. `file-metrics.ts` → `analysis.metrics`: 既存の `totalFiles`, `filesAnalyzed`, `filesExcluded` を再利用。
2. `label-manager` → `analysis.appliedLabels`: 既存のラベル決定結果を Summary に渡す。
3. `writeSummaryWithAnalysis` → `buildSummaryMarkdown`
4. Summary 専用 formatter 群が Markdown を生成
5. `core.summary.addRaw(markdown)` で書き込み。

## Sequence Diagram

```
AnalysisResult
    ↓ metrics.totalFiles / filesAnalyzed / filesExcluded
    ↓ appliedLabels
summary/summary-writer.buildSummaryMarkdown
    ↓ formatSummaryBasicMetrics(metrics)
    ↓ formatExcludedFiles(metrics.filesExcluded)
    ↓ formatAppliedLabels(appliedLabels)
core.summary.addRaw(markdown)
```

## API Changes

- Summary 専用 `formatSummaryBasicMetrics`, `formatExcludedFiles`, `formatAppliedLabels` を `summary/formatters` 配下に追加。
- 既存 `formatBasicMetrics` はコメント向けとして後方互換表示を維持。
- `writeSummaryWithAnalysis` へ渡す `analysis` 型に `appliedLabels` を含めることを確認する（既に含まれている場合はそのまま使用）。

## Error Handling

- 除外ファイルやラベルが空の場合は空文字／既定文言を返却し、不要なセクションを出力しない。
- 翻訳キー欠落時は既存の例外処理 (`Result.fromThrowable`) に委ね、ログ警告のみで済ませる。
- 新行追加による `Buffer.byteLength` のログ出力は既存処理がそのまま動作。

## Performance Considerations

- 除外ファイル・ラベルいずれも配列走査のみで軽量。
- ソートはせず、元の順序を尊重して O(n) で描画。

## Limitations

- 除外ファイルの並び順は現状維持（要件オープン質問）。
- ラベルの色やカテゴリー詳細は表示しない。必要であれば将来拡張とする。
- コメントとの情報差は最小限（Summary 側が superset）であることを前提とし、差異が発生した場合は今後の課題とする。
