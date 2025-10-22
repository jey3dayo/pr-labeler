# Requirements Document

## Introduction

Configuration Layer Pattern は、PR Labelerの設定管理を統一し、保守性とテスト容易性を向上させるためのアーキテクチャパターンです。現在、`Config` (action input由来) と `LabelerConfig` (pr-labeler.yml由来) が個別に管理され、環境変数も各所で直接参照されているため、優先順位が不明確でテストが困難です。本機能により、全ての設定ソースを統合し、明確な優先順位と疎結合な設計を実現します。

**ビジネス価値:**

- PRコメントの言語設定バグを修正し、ユーザー体験を向上
- 設定の由来を追跡可能にし、デバッグ効率を向上
- 各関数を疎結合化し、テストカバレッジを維持・向上
- 将来的な設定ソース追加を容易にし、拡張性を確保

## Requirements

### Requirement 1: Environment Layer の導入

**Objective:** 開発者として、環境変数アクセスが一箇所に集約されることで、テストが容易で依存関係が明確なコードベースを維持したい

#### Acceptance Criteria

1. WHEN PR Labelerが起動時に環境変数を読み込む THEN PR Labeler System SHALL `loadEnvironmentConfig()` 関数を通じて全ての環境変数を取得する
2. WHEN `loadEnvironmentConfig()` が呼び出される THEN PR Labeler System SHALL 以下の環境変数を `EnvironmentConfig` オブジェクトとして返す
   - `LANGUAGE` または `LANG` を `language` フィールドにマッピング
   - `GITHUB_TOKEN` または `GH_TOKEN` を `githubToken` フィールドにマッピング
3. WHERE ビジネスロジック層 THE PR Labeler System SHALL `process.env` を直接参照せず、`EnvironmentConfig` オブジェクトから値を取得する
4. WHEN 環境変数が複数ソース（例: `LANGUAGE` と `LANG`）で提供される THEN PR Labeler System SHALL 優先順位に従って1つの値を選択する
5. IF 環境変数が設定されていない THEN PR Labeler System SHALL `undefined` を返し、後続の優先順位処理に委ねる

### Requirement 2: 統合Config構築

**Objective:** 開発者として、全ての設定ソースが統合された CompleteConfig を使用することで、設定の優先順位が明確で保守しやすいコードを実現したい

#### Acceptance Criteria

1. WHEN PR Labelerが設定を構築する THEN PR Labeler System SHALL `buildCompleteConfig()` 関数で全ての設定ソースを統合する
2. WHEN `buildCompleteConfig()` が呼び出される THEN PR Labeler System SHALL 以下の引数を受け取る
   - `actionInputs: ActionInputs` (GitHub Actions input)
   - `labelerConfig: LabelerConfig` (pr-labeler.yml)
   - `envConfig: EnvironmentConfig` (環境変数)
3. WHEN 設定値が複数ソースで提供される THEN PR Labeler System SHALL 以下の優先順位で値を決定する
   - 優先度1: `actionInputs` (action input)
   - 優先度2: `labelerConfig` (pr-labeler.yml)
   - 優先度3: `envConfig` (環境変数)
   - 優先度4: デフォルト値
4. WHEN `buildCompleteConfig()` が設定を統合する THEN PR Labeler System SHALL `CompleteConfig` 型のオブジェクトを返す
5. WHERE デバッグログが有効 THE PR Labeler System SHALL 各設定値の由来（どのソースから取得したか）をログ出力する

### Requirement 3: 言語決定ロジックの明確化

**Objective:** ユーザーとして、action inputで `language: ja` を指定した際に、確実に日本語でPRコメントが表示されることを期待する

#### Acceptance Criteria

1. WHEN PR Labelerが言語を決定する THEN PR Labeler System SHALL `determineLanguage()` 関数を使用する
2. WHEN `determineLanguage()` が呼び出される THEN PR Labeler System SHALL 以下の引数を受け取る
   - `actionInputLanguage?: string` (action inputの言語設定)
   - `configFileLanguage?: string` (pr-labeler.ymlの言語設定)
   - `envLanguage?: string` (環境変数の言語設定)
3. WHEN 複数の言語設定が提供される THEN PR Labeler System SHALL 以下の優先順位で言語を決定する
   - 優先度1: `actionInputLanguage`
   - 優先度2: `configFileLanguage`
   - 優先度3: `envLanguage`
   - 優先度4: デフォルト値 `'en'`
4. WHEN 言語コードが不正な値（例: `'fr'`）である THEN PR Labeler System SHALL 警告ログを出力し、デフォルト値 `'en'` にフォールバックする
5. WHEN 言語コードがロケール形式（例: `'ja-JP'`, `'en-US'`）である THEN PR Labeler System SHALL 先頭2文字を正規化して使用する

### Requirement 4: i18n初期化の疎結合化

**Objective:** 開発者として、i18nモジュールが設定構造に依存しないことで、テストが容易で再利用可能なコードを実現したい

#### Acceptance Criteria

1. WHEN i18nを初期化する THEN PR Labeler System SHALL `initializeI18n(language: LanguageCode)` 関数を呼び出す
2. WHEN `initializeI18n()` が呼び出される THEN PR Labeler System SHALL 言語コード（`'en'` または `'ja'`）のみを引数として受け取る
3. IF `Config` オブジェクト全体が渡される THEN PR Labeler System SHALL コンパイルエラーを発生させる
4. WHEN i18n初期化が成功する THEN PR Labeler System SHALL `Result<void, ConfigurationError>` で成功を返す
5. WHEN i18n初期化が失敗する THEN PR Labeler System SHALL エラー詳細を含む `ConfigurationError` を返す

### Requirement 5: デバッグログとトレーサビリティ

**Objective:** 開発者として、設定値の由来を追跡可能にすることで、問題発生時のデバッグを迅速に行いたい

#### Acceptance Criteria

1. WHEN `buildCompleteConfig()` が設定を構築する THEN PR Labeler System SHALL デバッグログで以下の情報を出力する
   - 各設定ソースから読み込まれた生の値
   - 優先順位処理後の最終決定値
   - 各値がどのソースから採用されたか
2. WHEN `initializeI18n()` が呼び出される THEN PR Labeler System SHALL 以下の情報をデバッグログに出力する
   - 受け取った言語コード
   - i18next初期化の成否
3. WHERE GitHub Actions環境 THE PR Labeler System SHALL デバッグログを `@actions/core` の `debug()` APIで出力する
4. WHEN デバッグログが有効でない THEN PR Labeler System SHALL ログ出力のオーバーヘッドを最小化する
5. IF 設定値の決定で予期しない動作が発生する THEN 開発者 SHALL デバッグログから原因を特定できる

### Requirement 6: 既存テストの互換性維持

**Objective:** 開発者として、リファクタリング後もテストカバレッジ93%以上を維持し、既存機能が正常に動作することを保証したい

#### Acceptance Criteria

1. WHEN リファクタリングが完了する THEN PR Labeler System SHALL 全ての既存テストが成功する
2. WHEN テストスイートを実行する THEN PR Labeler System SHALL テストカバレッジ93%以上を維持する
3. WHEN 新しいモジュール（`config-builder.ts`, `environment-loader.ts`）を追加する THEN PR Labeler System SHALL 対応するテストファイルを作成する
4. WHEN i18nテスト（`__tests__/i18n.test.ts`）を更新する THEN PR Labeler System SHALL 新しいシグネチャ `initializeI18n(language: LanguageCode)` をテストする
5. IF テストが失敗する THEN PR Labeler System SHALL 失敗理由を明確なエラーメッセージで報告する

### Requirement 7: 型安全性の保証

**Objective:** 開発者として、TypeScriptの型システムを最大限活用し、コンパイル時にエラーを検出できるコードを維持したい

#### Acceptance Criteria

1. WHEN `CompleteConfig` インターフェースを定義する THEN PR Labeler System SHALL 全ての必須フィールドを型安全に定義する
2. WHEN `EnvironmentConfig` インターフェースを定義する THEN PR Labeler System SHALL 環境変数の値を `string | undefined` 型で表現する
3. WHERE 型推論が不十分な箇所 THE PR Labeler System SHALL 明示的な型注釈を追加する
4. WHEN TypeScript strict modeでコンパイルする THEN PR Labeler System SHALL エラーなくコンパイルが完了する
5. IF `any` 型または型アサーション（`as`）を使用する THEN PR Labeler System SHALL ESLintエラーを発生させる

### Requirement 8: 後方互換性の維持

**Objective:** ユーザーとして、既存のワークフローや設定ファイルが変更なしで動作し続けることを期待する

#### Acceptance Criteria

1. WHEN 既存のaction inputが提供される THEN PR Labeler System SHALL 現在と同じ動作を保証する
2. WHEN 既存のpr-labeler.yml設定ファイルが存在する THEN PR Labeler System SHALL 正しく読み込んで適用する
3. WHEN 環境変数が設定されている THEN PR Labeler System SHALL フォールバック値として使用する
4. IF action.ymlのinput定義を変更する THEN PR Labeler System SHALL 既存のワークフローとの互換性を維持する
5. WHEN PRコメントや GitHub Actions Summaryを出力する THEN PR Labeler System SHALL 既存と同じフォーマットを維持する

## Out of Scope

以下は本要件の対象外とします：

1. **新しい設定ソースの追加** - ファイルシステム設定ファイル、データベース等の追加は対象外
2. **他モジュールのリファクタリング** - 設定管理以外のモジュール（label-manager, comment-manager等）の変更は対象外
3. **パフォーマンス最適化** - 設定読み込みの高速化や キャッシュ機構の追加は対象外
4. **ユーザーインターフェースの変更** - action.ymlのinput追加や削除は対象外

## Constraints

1. **Node.js互換性**: Node.js 20以上で動作すること
2. **TypeScript strict mode**: 全てのstrictオプションを有効にすること
3. **neverthrowパターン**: エラーハンドリングは`Result<T, E>`型を使用すること
4. **テストカバレッジ**: 93%以上を維持すること
5. **既存APIの互換性**: `@actions/core`, `@actions/github`のAPIバージョンを変更しないこと
6. **ビルドサイズ**: `dist/index.js`のサイズを大幅に増加させないこと（5%以内）
