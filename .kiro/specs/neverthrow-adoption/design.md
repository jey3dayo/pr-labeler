# Design Document

## 1. Feature Classification & Scope

- **分類:** 既存機能の拡張（Extension）。`run()` パイプラインと GitHub API 呼び出し周辺のエラーハンドリングを neverthrow 流儀に揃える。
- **影響範囲:** `src/index.ts`, `src/workflow/stages/`, `src/ci-status.ts`, `src/actions-io.ts`, `src/errors/` 配下、関連テスト。ビルド・設定・翻訳資産には非破壊。
- **非目標:** エラー型の全面刷新や、Result 未対応の全モジュール改修。今回対象は requirements で指定された主要フローとログ整合性に限定。

## 2. Requirements Traceability

| 要件 | 技術要素 | 対応方針 |
| --- | --- | --- |
| Req1-1〜1-4 | `run()` パイプライン, `workflow/stages/*` | パイプライン全体を `ResultAsync` で統合し、成功時だけ `setFailed` を呼ばない構成に変更。 |
| Req2-1〜2-4 | `ci-status.ts`, `workflow/stages/labeling.ts`, `label-applicator.ts` | GitHub API 呼び出し箇所を `ResultAsync` に変更し、`GitHubAPIError`/`RateLimitError` を返却。 |
| Req3-1〜3-4 | `actions-io.ts`, `i18n.ts`, `summary/summary-writer.ts`, 各テスト | ログ翻訳キー維持、Result Err のログ整合、テスト更新で Result ベースのアサーションを追加。 |

## 3. 現状分析

### 3.1 ランタイムフロー

- `src/index.ts` の `run()` が `try/catch` で全ステージをラップ。
- 各ステージ (`initializeAction`, `analyzePullRequest`, `applyLabelsStage`, `finalizeAction`) は promise を返すが Result ではなく、例外で失敗を伝播。
- エラーログは `logErrorI18n`/`setFailed` へ文字列渡し。

### 3.2 GitHub API 呼び出し

- `ci-status.ts#getCIStatus` は `try/catch` で失敗時 null を返すため、原因が失われる。
- `workflow/stages/labeling.ts` のコミット取得は `try/catch` で握り、警告ログのみ。
- `label-applicator.ts` は部分的に `ResultAsync` を利用しているが、内部リトライ関数は素の `try/catch`。

### 3.3 ロギング・i18n

- `actions-io.ts` は Result 未依存のままログ関数を提供。
- 要約 (`summary-writer`) やコメント管理は既に Result を返しているため整合性は高いが、entry-point での例外捕捉で構造化情報が欠落する。

## 4. 提案アーキテクチャ

### 4.1 パイプライン統合

`run()` を薄いラッパにし、`executeAction()`（仮称）が `ResultAsync<void, AppError>` を返す。

```mermaid
graph TD
  A[Start Action] --> B[executeAction(): ResultAsync]
  B -->|Ok| C[logInfoI18n success]
  B -->|Err(AppError)| D[formatAppError]
  D --> E[logErrorI18n]
  E --> F[setFailed]
```

- `executeAction` 内で `ResultAsync.fromPromise` と `.andThen` を用い、各ステージの Result を連結。
- 各ステージは既存戻り値を流用しつつ、失敗時は `err(...)` を返すよう修正。

### 4.2 エラー変換ヘルパー

- 新規モジュール `src/errors/result-helpers.ts`（仮）を追加し、`toAppError(error: unknown): AppError` と `formatAppError(appError, options)` を定義。
  - 既存 `createUnexpectedError` 再利用で未分類例外を包む。
  - i18n ログ向けに `{ key, params }` を返し、`logErrorI18n` へ安全に渡す。

### 4.3 GitHub API Result 化

- `getCIStatus`: 返り値型を `ResultAsync<CIStatus | null, AppError>` に変更。`octokit.paginate` を `ResultAsync.fromPromise` でラップし、失敗時は例外を `toAppError` で `AppError` に変換して返却（`createGitHubAPIError` または `createUnexpectedError` を経由）。
- `applyLabelsStage`:
  - CI ステータス取得を `match` してログ分岐。
  - コミット取得も `ResultAsync.fromPromise` 化し、`RateLimitError`／`GitHubAPIError` を map。
  - Directory Labeler 連携ロジックは既存の Result 連結を維持。

### 4.4 ロギング整合

- `actions-io.ts` に Result 由来メッセージをフォーマットする `logErrorFromAppError(appError)` を追加し、翻訳キーを維持（既存 `logErrorI18n` を再利用）。
- `summary-writer`・`comment-manager` は現行の Result を返しているため、呼び出し側のメッセージ整形のみ調整で済む。

### 4.5 テスト整備

- `__tests__/index.test.ts`: `executeAction` の Ok/Err パスを Vitest で検証。`setFailed` モック経由で Err 時のみ呼ばれることを確認。
- `__tests__/ci-status.test.ts`: ResultAsync に合わせて mock を更新し、Err ケース（403/500 等）を追加。
- `__tests__/workflow/labeling-stage.test.ts`: `getCIStatus` の Err を想定した分岐、RateLimit のログ検証を追加。

## 5. 主要コンポーネント詳細

### 5.1 executeAction (new)

- **役割:** アクション全体の Result パイプライン。
- **入力:** なし。
- **出力:** `ResultAsync<void, AppError>`。
- **処理:**
  1. `initializeAction()` → Result 化 (`ResultAsync.fromPromise`).
  2. `.andThen` で `analyzePullRequest` / `applyLabelsStage` / `finalizeAction` を順次実行。
  3. 各ステージの Result は新たに `ResultAsync` 化。

### 5.2 Stage 関数改修

- **initializeAction:** 現在 `Promise<InitializationArtifacts>` を返す。`ResultAsync.fromPromise` で包み、`parseActionInputs` の Err をそのまま伝播。
- **analyzePullRequest:** 既存で throw している `diffResult.error` などを `err` で返すよう変更。ログ出力と i18n メッセージは維持。
- **applyLabelsStage:**
  - `getCIStatus` 呼び出しを Result 化。
  - コミット pagination を `ResultAsync.fromPromise` → `mapErr(createGitHubAPIError)`。
  - Directory Labeler 部分の return 型を `ResultAsync<void, AppError>` に揃える。
- **finalizeAction:** コメント管理・サマリ書き込みの Result を統合し、Err をそのまま返す。ただし summary 失敗は警告ログ後 Ok を返す（Req3-2）ため、`mapErr` でロギング後 `ok(undefined)` を返すパターンを利用。

### 5.3 エラー整形ユーティリティ

- `formatAppError(appError)`:
  - `switch(appError.type)` でログ翻訳キー (`logs:completion.failed` など) を決定。
  - `GitHubAPIError` は `status` をログに含める。
  - `RateLimitError` は `retryAfter` を秒数で表示。

### 5.4 リトライ処理の整合

- `label-applicator.ts` の `retryWithBackoff` は内部で例外投げるが、外層の `ResultAsync.fromPromise` が Err へ変換。ログ強化として `mapErr` でステータスと残リトライ回数を記録。

## 6. エラー戦略

- **カテゴリ:** 既存 `AppError` を踏襲し、`UnexpectedError` と `GitHubAPIError`/`RateLimitError` を主に扱う。
- **回復:** Rate Limit Err はログのみで継続（Req2-3）。`finalizeAction` の summary 失敗はワークフロー失敗にしない。
- **ロギング:** `logErrorI18n(key, params)` を中心に、Result Err には `formatAppError` で共通化。予期せぬ例外は `createUnexpectedError` で包む。

## 7. テスト戦略

- **Unit:**
  - `index.test.ts`: `executeAction` の成功/失敗。
  - `ci-status.test.ts`: API 失敗 → Err。
  - `workflow/labeling-stage.test.ts`: `getCIStatus` Err 処理、RateLimit ログ。
- **Integration:** `__tests__/integration.test.ts` を Result 化後でも通るよう、モック更新。
- **Regression:** `error-factories-i18n.test.ts` で `formatAppError` の新ケースを追加確認。

## 8. リスクと緩和策

| リスク | 緩和 |
| --- | --- |
| Result 化によるステージ戻り値の型破壊 | 段階的に `ResultAsync` を導入し、型エラーを利用して漏れを検知。 |
| 重複ログ・重複 setFailed 呼び出し | `executeAction` で一箇所に集約、ステージ内では fatal ログを抑制。 |
| コミット取得 RateLimit 時の挙動変化 | ログのみで継続する現挙動を維持しつつ、再試行計画は将来課題と明記。 |
| テストのモック更新漏れ | `ResultAsync` の`mockResolvedValue(okAsync(...))` 形式に統一して網羅。 |

## 9. スケジュールとタスク案

1. `executeAction` 新設と `run()` リファクタ。
2. ステージごとの Result 化。
3. `ci-status.ts` と GitHub API 呼び出し更新。
4. エラー整形ユーティリティ+ログ更新。
5. テスト改修と追加。
6. 翻訳キー・ログ最終確認。

## 10. オープンポイント

- RateLimit への自動再試行（p-limit との協調）は将来検討とし、本タスクではログ通知のみ。
- `finalizeAction` での summary 失敗を Result Err とするか警告ログのみに留めるかは requirements の通り現状維持。
