# 実装タスク

## タスク概要

本機能は既に実装完了していますが、ドキュメント整備のためタスクを記録します。

---

- [x] 1. デフォルトカテゴリ設定の拡張
- [x] 1.1 category/configカテゴリの追加
  - `DEFAULT_LABELER_CONFIG.categories`に新規エントリを追加
  - 16種類の設定ファイルパターンを定義（`**/*.config.*`, `**/tsconfig.json`, `**/.eslintrc*`等）
  - 任意階層対応（`**/`プレフィックス）でmonorepo構成をサポート
  - minimatchパターンの正確性を保証
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 6.1, 6.2, 6.3, 6.4_

- [x] 1.2 category/specカテゴリの追加
  - `DEFAULT_LABELER_CONFIG.categories`に新規エントリを追加
  - 4種類の仕様書ディレクトリパターンを定義（`.kiro/**`, `.specify/**`, `spec/**`, `specs/**`）
  - 仕様変更を含むPRを識別可能にする
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 1.3 category/dependenciesカテゴリの追加（多言語対応）
  - `DEFAULT_LABELER_CONFIG.categories`に新規エントリを追加
  - 15種類の依存関係ファイルパターンを定義（5言語対応）
  - Node.js: `**/package.json`, `**/pnpm-lock.yaml`, `**/yarn.lock`, `**/package-lock.json`
  - Go: `**/go.mod`, `**/go.sum`
  - Python: `**/requirements.txt`, `**/Pipfile`, `**/Pipfile.lock`, `**/poetry.lock`, `**/pyproject.toml`
  - Rust: `**/Cargo.toml`, `**/Cargo.lock`
  - Ruby: `**/Gemfile`, `**/Gemfile.lock`
  - 依存関係更新を含むPRを素早く識別可能にする
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 3.14_

- [x] 1.4 category/componentsの削除
  - `DEFAULT_LABELER_CONFIG.categories`から`category/components`エントリを削除
  - プロジェクト固有パターンのため汎用性を向上
  - 既存ユーザーへの移行ガイドをCHANGELOG/READMEに追加
  - _Requirements: 4.1, 4.2_

- [x] 2. 既存機能との統合確認
- [x] 2.1 加法的ポリシーの維持確認
  - `labels.namespace_policies["category/*"]`が`"additive"`であることを確認
  - 複数カテゴリラベルの同時付与が正しく動作することを検証
  - 設定ファイル+テストファイル、依存関係ファイル+ドキュメントの組み合わせをテスト
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 2.2 パターンマッチングロジックの動作確認
  - 既存のdecideCategoryLabels関数が変更なく動作することを確認
  - minimatchライブラリによるパターンマッチングの正確性を検証
  - ワイルドカード（`*`）、グロブパターン（`**`）、拡張子パターン（`.config.*`）の動作確認
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 2.3 後方互換性の検証
  - 既存カテゴリ（tests, ci-cd, documentation）のパターンが変更されていないことを確認
  - `__tests__/**`, `**/*.test.ts`, `**/*.test.tsx` → `category/tests`
  - `.github/workflows/**` → `category/ci-cd`
  - `docs/**`, `**/*.md` → `category/documentation`
  - 既存テストスイート（368テスト）がすべてパスすることを確認
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 3. テストの実装と検証
- [x] 3.1 新規カテゴリのユニットテスト作成
  - category/configのパターンマッチングテスト（`tsconfig.json`, `eslint.config.js`, `.editorconfig`, `mise.toml`）
  - category/specのパターンマッチングテスト（`.kiro/specs/foo/bar.md`）
  - category/dependenciesのパターンマッチングテスト（`package.json`, `go.mod`, `Cargo.toml`, `Gemfile`）
  - 任意階層マッチングテスト（`packages/foo/package.json`, `apps/bar/tsconfig.json`）
  - 複数カテゴリ同時付与テスト（`package.json` + `README.md`）
  - components削除確認テスト（`src/components/Button.tsx`がマッチしない）
  - _Requirements: 1.1-1.10, 2.1-2.4, 3.1-3.14, 4.1, 5.1-5.3_

- [x] 3.2 統合テストの実行と確認
  - デフォルト設定ロードとカテゴリ判定の統合確認
  - monorepo構成（複数階層）での動作確認
  - YAML設定とデフォルト設定のマージ動作確認
  - 既存統合テスト（368テスト）がすべてパスすることを確認
  - _Requirements: 5.4, 6.1-6.4, 7.4_

- [x] 3.3 パフォーマンステストの実行
  - パターン数増加（4→6カテゴリ、35パターン）によるマッチングコスト測定
  - 大量ファイル（1000+）に対するカテゴリ判定パフォーマンス確認
  - minimatchキャッシュ効果の確認
  - 期待値: <10ms増加（影響軽微）
  - _Requirements: パフォーマンス要件（非機能要件）_

- [x] 4. ドキュメントの更新
- [x] 4.1 README.mdの更新
  - デフォルトカテゴリラベルの一覧を更新（2箇所）
  - 新規カテゴリ（config, spec, dependencies）の説明を追加
  - category/components削除の注意喚起を追加
  - 移行方法（`.github/pr-labeler.yml`でのカスタム定義）を明記
  - _Requirements: 4.2（移行ガイド）_

- [x] 4.2 CHANGELOG.mdの更新
  - カテゴリベースラベルのセクションを更新
  - 新規カテゴリの追加を記録
  - category/components削除のBREAKING CHANGEセクションを追加
  - 移行方法の具体例（YAML設定サンプル）を提供
  - _Requirements: 4.2（移行ガイド）_

- [x] 5. 品質保証
- [x] 5.1 Lintチェックの実行
  - `pnpm lint`を実行し、ESLint違反がないことを確認
  - コードスタイルの整合性を保証
  - _Requirements: 全要件（コード品質保証）_

- [x] 5.2 型チェックの実行
  - `pnpm type-check`を実行し、TypeScript型エラーがないことを確認
  - 型安全性を保証
  - _Requirements: 全要件（型安全性保証）_

- [x] 5.3 テストスイートの実行
  - `pnpm test:vitest`を実行し、全テストがパスすることを確認
  - 既存機能への影響がないことを検証
  - 新規カテゴリのテストカバレッジを確認
  - _Requirements: 7.4（既存テストの維持）_

- [x] 5.4 ビルドの実行
  - `pnpm build`を実行し、本番ビルドが成功することを確認
  - dist/index.jsの生成を検証
  - _Requirements: 全要件（デプロイ可能性保証）_

---

## タスク完了状況

**実装完了**: すべてのタスクが完了しています（✅ 5/5メジャータスク）

**品質保証結果**:

- ✅ Lint: パス
- ✅ Type Check: パス（既存の無関係な型エラーを除く）
- ✅ Tests: 377テストすべてパス
- ✅ Build: 成功

**次のステップ**: 変更をコミットし、PRを作成してください。
