# Design Document

Language: ja

## Introduction
Summary 出力に、総変更ファイル数と解析対象ファイル数を明示する行と、除外ファイル一覧を折りたたみ表示する仕組みを追加する。既存のコメント生成ロジックや i18n リソースを再利用し、Summary のみを拡張する。

## Architecture
- Summary 表示は `summary/summary-writer.ts` で構築されるため、同ファイルおよび `summary/formatters/basic-metrics.ts` に手を入れる。
- 除外ファイルの `<details>` ブロックを新たな formatter 関数（例: `formatExcludedFiles`）として `summary/formatters` 配下に追加し、Summary でのみ使用する。
- i18n は `locales/en/summary.json`, `locales/ja/summary.json` を更新。必要なら `logs` など他 namespace にもキー追加。
- コメント出力は `report-formatter.ts` を介しているため、Summary 専用の追加行がコメントに影響しないよう `formatBasicMetrics` をオプション付きに変更し、呼び出し元で制御する。

## Components
1. `formatBasicMetrics` の拡張
   - 引数にオプション（例: `{ includeAnalyzedLine?: boolean }`）を追加。
   - Summary では総変更ファイル数と解析対象ファイル数を別行で表示し、コメントでは従来通りの表示を維持。
2. `formatExcludedFiles`（新規）
   - 引数: 除外ファイル配列、翻訳キー。
   - `<details><summary>` にラベル + 件数、本文に `-` リストを出力。
   - Summary 専用の挙動とするため、コメント側では使用しない。
3. `buildSummaryMarkdown`
   - Basic Metrics 呼び出し時に新オプションを渡す。
   - 除外ファイルが存在する場合のみ `formatExcludedFiles` の出力を挿入。
4. テスト・スナップショット
   - `report-formatter.test.ts`: Basic Metrics のテストとスナップショットを更新し、オプション有無の両方を確認。
   - `summary-writer.test.ts`: 新行と除外一覧を確認。
   - コメント生成 (`comment-manager.test.ts`) のスナップショットが変わらないことを検証。
   - 多言語 (en/ja) の出力をカバーする。
5. i18n 更新
   - `Files Analyzed`, `解析対象ファイル数` のキーを追加。
   - `Excluded Files (N)` 用の summary 文言を追加。

## Data Flow
1. `file-metrics.ts` → `analysis.metrics`: 既存の `totalFiles`, `filesAnalyzed`, `filesExcluded` を再利用。
2. `writeSummaryWithAnalysis` → `buildSummaryMarkdown`
3. `formatBasicMetrics(metrics, { includeAnalyzedLine: true })`
4. `formatExcludedFiles(metrics.filesExcluded)`
5. 生成した Markdown を `core.summary` に書き込む。

## Sequence Diagram
```
AnalysisResult
    ↓ metrics.totalFiles, filesAnalyzed, filesExcluded
summary/summary-writer.buildSummaryMarkdown
    ↓ formatBasicMetrics(metrics, { includeAnalyzedLine: true })
    ↓ formatExcludedFiles(metrics.filesExcluded)
core.summary.addRaw(markdown)
```

## API Changes
- `formatBasicMetrics` にオプション引数追加（デフォルト false で後方互換を維持）。
- 新関数 `formatExcludedFiles` をエクスポートせず summary-writer 内だけで利用するか、再利用可能性のためにエクスポートするかは要判断（現状は summary 専用想定）。

## Error Handling
- 除外ファイルリストが空の場合は空文字を返却し、Summary 本文に挿入しない。
- 文字列整形エラーや翻訳キー欠落時は既存の例外処理 (`Result.fromThrowable`) に委ねる。
- 新行追加による `Buffer.byteLength` のログ出力は既存処理がそのまま動作。

## Performance Considerations
- 除外ファイル一覧が長くても `<details>` 配下にフラットなリストを出力するだけなので影響は軽微。
- 既存のソート処理は行わず、metrics から渡された順序を維持して O(n) で描画。

## Limitations
- 除外ファイルの並び順は現状維持（要件オープン質問）。
- `Files Analyzed` の表示に伴い、コメント側に行を追加しないよう呼び出しオプション管理に依存。
