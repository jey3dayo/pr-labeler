# Implementation Tasks

- [ ] 1. Summary 基本メトリクス拡張
  - [ ] 1.1 Summary 専用 `formatSummaryBasicMetrics` を実装し、総変更ファイル数と解析対象ファイル数を別行で表示する
  - [ ] 1.2 コメント向け `formatBasicMetrics` の既存挙動を維持しつつ、呼び出し分岐を追加する
  - [ ] 1.3 英語／日本語の翻訳キー（"Files Analyzed" など）を追加する

- [ ] 2. 除外ファイル折りたたみ表示
  - [ ] 2.1 `formatExcludedFiles` を実装し、`<details><summary>` 構造で除外ファイルを列挙する
  - [ ] 2.2 Summary 本文 (`buildSummaryMarkdown`) に条件付きで挿入する
  - [ ] 2.3 i18n キー（"Excluded Files (N)" / "除外ファイル (N)"）を追加する

- [ ] 3. 適用ラベルセクション追加
  - [ ] 3.1 `formatAppliedLabels` を実装し、ラベル配列を Markdown 行／リストで表示する
  - [ ] 3.2 ラベル未適用時の挙動（"No labels applied"）を Summary で反映する
  - [ ] 3.3 分析結果から Summary へラベル配列を渡す経路を確認・必要に応じて拡張する

- [ ] 4. テスト・スナップショット更新
  - [ ] 4.1 `report-formatter.test.ts` の英語／日本語スナップショットを更新し、Summary 用フォーマットを検証する
  - [ ] 4.2 `summary-writer.test.ts` に Summary 全体のスナップショットまたは期待値テストを追加／更新する
  - [ ] 4.3 `comment-manager.test.ts` のスナップショットが期待どおり（影響なし or 意図した変更）であることを確認する
  - [ ] 4.4 `pnpm lint`, `pnpm type-check`, `pnpm test`, `pnpm build` を実行して成功することを確認する

- [ ] 5. ドキュメンテーションと補足
  - [ ] 5.1 README や docs に Summary 表示の変更点（解析対象数・除外一覧・ラベル表示）を追記する
  - [ ] 5.2 ログ／翻訳リソースに欠落がないか確認し、必要に応じて追記する
