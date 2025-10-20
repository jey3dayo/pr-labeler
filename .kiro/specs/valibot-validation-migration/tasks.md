# 実装タスク - Valibot型バリデーション移行

対象: `valibot-validation-migration`
前提: requirements/design 承認済（バンドル増加≤5KB、未知キーはstrict運用）

## 1. 依存関係とビルド

- [ ] `valibot` を `dependencies` に追加（最新版）
- [ ] `@vercel/ncc` を `devDependencies` で `>=0.40` に更新
- [ ] `pnpm build` で CJS バンドル生成を確認（`dist/` 出力）
- [ ] バンドルサイズ計測（基準: 変更前との差分が≤5KB）
  - 対象: `dist/index.js`（非圧縮・ファイルサイズ）
  - 手順: 変更前後で `du -k dist/index.js` などで計測し差分を記録

## 2. スキーマ実装

- [ ] `src/schemas/errors.ts` を新設し `ComplexityAnalysisErrorSchema` を定義
  - 必須: `type: 'ComplexityAnalysisError'`, `reason`（enum）, `message`
  - 任意: `filename`, `details`, `fileSize`, `maxSize`, `timeoutSeconds`
  - 未知キー: strict（未知プロパティは拒否）
- [ ] `export type ComplexityAnalysisErrorOut = v.InferOutput<typeof ComplexityAnalysisErrorSchema>` を公開
- [ ] 列挙値の単一情報源化（`ComplexityAnalysisReasonEnum`）を公開

## 3. 型ガード移行

- [ ] `src/errors.ts` の `isComplexityAnalysisError` を `safeParse` ベースに置換
  - シグネチャは維持: `(e: unknown) => e is ComplexityAnalysisError`
  - 内部で `ComplexityAnalysisErrorSchema` を参照
- [ ] `src/errors.ts` に Valibot 使用例コメントを追記（要件7.1）

## 4. テスト

- [ ] スキーマ単体テスト `__tests__/schemas/errors.test.ts`
  - 正常/必須欠落/型不一致/列挙違反/未知キー を網羅
  - スキーマ定義のカバレッジ100%
- [ ] 型ガードテスト `__tests__/errors.test.ts`
  - `true/false`の正常・異常・境界値
  - 互換性: 旧実装と同一入力で真偽一致
- [ ] 統合テスト（任意）
  - 例外捕捉フローでの型絞り込み確認
- [ ] カバレッジ閾値確認（総合90%以上）

## 5. パフォーマンス/サイズ検証

- [ ] 型ガード実行時間の近似比較（旧/新で差分≤10%）
- [ ] バンドルサイズ差分の記録（≤5KB）
- [ ] 記録結果を `docs/valibot-migration-metrics.md` に追記（新規）

## 6. ドキュメント/メタデータ

- [ ] `CHANGELOG.md` に移行点とトレードオフを追記（要件7.5）
- [ ] `docs/valibot-migration.md` に導入ガイド（使用例/追加手順/strict方針/計測方法）
- [ ] `.kiro/specs/valibot-validation-migration/spec.json` を適宜更新（tasks進捗）

## 7. ローカル品質保証（必須）

- [ ] `pnpm lint`
- [ ] `pnpm type-check`
- [ ] `pnpm test`（カバレッジ確認）
- [ ] `pnpm build`（`dist/`生成・サイズ計測）

## 8. PR/CI

- [ ] フィーチャーブランチへプッシュ、PR作成
- [ ] CIの Code Quality / Integration Tests / Docs / PR Metrics / Quality Gate を全通過
- [ ] レビュー反映 → 承認後マージ（squash推奨）

---

チェックリスト完了後、`/release --dry-run` で影響範囲の事前確認（任意）。
