# 要件定義書 - Valibot型バリデーション移行

## はじめに

本機能は、手動で実装された型ガード関数をValibotライブラリに置き換えることで、型安全性の向上とメンテナンスコストの削減を実現します。現在、`src/errors.ts`には手動実装の型ガード関数が多数存在し、型定義変更時の手動更新が必要になっています。Valibotを導入することで、スキーマから型が自動推論され、型変更時の自動追従が可能になります。

### ビジネス価値

- **型安全性の向上**: スキーマと型が一致し、実行時バリデーションが強化される
- **メンテナンスコスト削減**: 型変更時に型ガード関数の手動更新が不要になる
- **開発生産性向上**: 手動型ガード関数の記述が不要になる
- **バグ削減**: ランタイムバリデーションによりバグの早期検出が可能になる

## 要件

### 要件1: 依存関係の更新

**目的:** 開発者として、Valibotライブラリと互換性のある最新ツールチェーンを使用したいので、CommonJS/ESMの互換性問題を回避できる

#### 受入基準

1. WHEN 開発者が依存関係をインストールするとき THEN PR Labelerシステム は @vercel/ncc 0.40以上をdevDependenciesに追加しなければならない
2. WHEN 開発者が依存関係をインストールするとき THEN PR Labelerシステム は valibot最新版をdependenciesに追加しなければならない
3. WHEN ビルドプロセスが実行されるとき THEN PR Labelerシステム は CommonJS形式で正常にバンドルできなければならない
4. WHEN ビルドプロセスが実行されるとき THEN PR Labelerシステム は バンドルサイズの増加が5KB以下でなければならない
5. WHEN パッケージマネージャーコマンドが実行されるとき THEN PR Labelerシステム は pnpm installでバージョンコンフリクトエラーが発生してはならない

### 要件2: エラー型ガード関数のValibot移行

**目的:** 開発者として、エラー型定義を変更したときに型ガード関数を自動的に更新したいので、手動更新の手間とヒューマンエラーを削減できる

#### 受入基準

1. WHEN `ComplexityAnalysisError`型が定義されているとき THEN PR Labelerシステム は 対応するValibotスキーマ`ComplexityAnalysisErrorSchema`を定義しなければならない
2. WHEN `isComplexityAnalysisError`関数が呼ばれるとき THEN PR Labelerシステム は Valibotの`safeParse`メソッドを使用して型チェックを実行しなければならない
3. IF 未知の値が`ComplexityAnalysisError`型に適合するとき THEN `isComplexityAnalysisError`関数 は trueを返さなければならない
4. IF 未知の値が`ComplexityAnalysisError`型に適合しないとき THEN `isComplexityAnalysisError`関数 は falseを返さなければならない
5. WHEN エラー型定義が更新されたとき THEN PR Labelerシステム は スキーマ定義の更新のみでTypeScriptの型チェックが成功しなければならない

### 要件3: 型スキーマの定義と管理

**目的:** 開発者として、エラー型のスキーマを一元管理したいので、型定義とバリデーションロジックの整合性を保てる

#### 受入基準

1. WHERE `ComplexityAnalysisError`型が存在する場合 THE PR Labelerシステム は 対応するValibotスキーマをエクスポートしなければならない
2. WHEN Valibotスキーマが定義されるとき THEN PR Labelerシステム は 全ての必須プロパティ(`type`, `reason`, `message`)を含まなければならない
3. WHEN Valibotスキーマが定義されるとき THEN PR Labelerシステム は オプショナルプロパティ(`filename`)を`v.optional()`で宣言しなければならない
4. WHEN Valibotスキーマが定義されるとき THEN PR Labelerシステム は 追加任意プロパティ(`details`, `fileSize`, `maxSize`, `timeoutSeconds`)を`v.optional()`で宣言しなければならない
5. WHEN Valibotスキーマが定義されるとき THEN PR Labelerシステム は enum型プロパティ(`reason`)を`v.enum()`で厳密に定義しなければならない
6. WHEN Valibotスキーマが定義されるとき THEN PR Labelerシステム は literal型プロパティ(`type`)を`v.literal()`で定義しなければならない

### 要件4: 後方互換性の保証

**目的:** 開発者として、既存のコードを変更せずにValibotへ移行したいので、大規模なリファクタリングを避けられる

#### 受入基準

1. WHEN 既存の型ガード関数がValibotに置き換わるとき THEN PR Labelerシステム は 関数のシグネチャを変更してはならない
2. WHEN 既存の型ガード関数がValibotに置き換わるとき THEN PR Labelerシステム は 呼び出し側のコードを変更せずに動作しなければならない
3. IF 既存の型ガード関数が`true`を返す入力値の場合 THEN Valibot版の型ガード関数 も`true`を返さなければならない
4. IF 既存の型ガード関数が`false`を返す入力値の場合 THEN Valibot版の型ガード関数 も`false`を返さなければならない
5. WHEN 既存のテストスイートが実行されるとき THEN PR Labelerシステム は 全てのテストがパスしなければならない

### 要件5: テストカバレッジの維持

**目的:** 開発者として、Valibot移行後も高いテストカバレッジを維持したいので、品質劣化を防止できる

#### 受入基準

1. WHEN Valibot型ガード関数のテストが実行されるとき THEN PR Labelerシステム は 正常系のテストケースをカバーしなければならない
2. WHEN Valibot型ガード関数のテストが実行されるとき THEN PR Labelerシステム は 異常系のテストケース(無効な型、null、undefined)をカバーしなければならない
3. WHEN テストカバレッジレポートが生成されるとき THEN PR Labelerシステム は 全体のカバレッジ率が90%以上でなければならない
4. WHEN テストカバレッジレポートが生成されるとき THEN PR Labelerシステム は 新規追加したスキーマ定義のカバレッジ率が100%でなければならない
5. WHEN Valibot型ガード関数のテストが実行されるとき THEN PR Labelerシステム は 境界値のテストケースをカバーしなければならない

### 要件6: 型安全性の向上

**目的:** 開発者として、型定義とランタイムバリデーションの不整合を防ぎたいので、実行時エラーを事前に検出できる

#### 受入基準

1. WHEN TypeScriptコンパイラが型チェックを実行するとき THEN PR Labelerシステム は Valibotスキーマから推論された型がTypeScript型定義と一致しなければならない
2. WHEN TypeScriptコンパイラが型チェックを実行するとき THEN PR Labelerシステム は `any`型を使用してはならない
3. WHEN TypeScriptコンパイラが型チェックを実行するとき THEN PR Labelerシステム は 型アサーション(`as`)を最小限にしなければならない
4. WHEN Valibotスキーマの型推論が使用されるとき THEN PR Labelerシステム は `v.InferOutput<typeof Schema>`で正しい型を推論しなければならない
5. IF Valibotスキーマに新しいプロパティが追加されたとき THEN TypeScriptコンパイラ は 既存コードの型エラーを検出しなければならない

### 要件7: ドキュメントの更新

**目的:** 開発者として、Valibotの使用方法を理解したいので、チーム全体が同じパターンで実装できる

#### 受入基準

1. WHEN Valibot導入が完了したとき THEN PR Labelerシステム は `src/errors.ts`にValibotの使用例をコメントで記載しなければならない
2. WHEN Valibot導入が完了したとき THEN PR Labelerシステム は 新しい型ガード関数の追加方法をドキュメント化しなければならない
3. WHEN Valibot導入が完了したとき THEN PR Labelerシステム は トレードオフ分析(バンドルサイズ増加、学習コスト)を記録しなければならない
4. WHEN Valibot導入が完了したとき THEN PR Labelerシステム は 移行前後のパフォーマンス比較を記録しなければならない
5. WHEN Valibot導入が完了したとき THEN PR Labelerシステム は 既存の型ガード関数からの変更点をCHANGELOG.mdに記載しなければならない

---

## 補足: レビュー対応事項（2025-10-20 追記）

- スキーマ方針: `ComplexityAnalysisErrorSchema` を新設し、必須（`type`, `reason`, `message`）に加え、任意（`filename`, `details`, `fileSize`, `maxSize`, `timeoutSeconds`）を含める。
- 未知キーの扱い: 既知プロパティ以外は原則許容しない（strict）。将来拡張はスキーマへプロパティ追加で対応する。
- 型の単一情報源: 実装で利用する型は `v.InferOutput<typeof ComplexityAnalysisErrorSchema>` を基本とする。
- 型ガード移行: `isComplexityAnalysisError` は Valibot の `safeParse` を用いた内部実装へ置換（関数シグネチャは変更しない）。
- バンドルサイズ管理: `@vercel/ncc >= 0.40` を使用し、import を最小化。サイズ増加は≦5KBを維持するよう計測/管理する。

1. WHEN Valibot導入が完了したとき THEN PR Labelerシステム は `docs/valibot-migration.md`に移行ガイドを作成しなければならない

### 要件8: CI/CDパイプラインの検証

**目的:** 開発者として、Valibot導入後もCI/CDパイプラインが正常に動作することを確認したいので、本番環境での不具合を防止できる

#### 受入基準

1. WHEN GitHub Actions CI/CDワークフローが実行されるとき THEN PR Labelerシステム は 全てのlintチェックがパスしなければならない
2. WHEN GitHub Actions CI/CDワークフローが実行されるとき THEN PR Labelerシステム は 全ての型チェックがパスしなければならない
3. WHEN GitHub Actions CI/CDワークフローが実行されるとき THEN PR Labelerシステム は 全てのテストがパスしなければならない
4. WHEN GitHub Actions CI/CDワークフローが実行されるとき THEN PR Labelerシステム は ビルドプロセスが正常に完了しなければならない
5. WHEN GitHub Actions CI/CDワークフローが実行されるとき THEN PR Labelerシステム は dist/ディレクトリにバンドルファイルが生成されなければならない
6. WHEN GitHub Actions CI/CDワークフローが実行されるとき THEN PR Labelerシステム は バンドルサイズの回帰チェックを実行しなければならない

### 要件9: パフォーマンスの維持

**目的:** 開発者として、Valibot導入後もGitHub Actionsの実行時間が大幅に増加しないことを確認したいので、CI/CDパイプラインの効率を維持できる

#### 受入基準

1. WHEN Valibot型ガード関数が実行されるとき THEN PR Labelerシステム は 実行時間が既存の手動型ガード関数と比較して10%以内の差でなければならない
2. WHEN バンドルファイルが生成されるとき THEN PR Labelerシステム は バンドルサイズの増加が5KB以下でなければならない
3. WHEN GitHub Actionsが起動するとき THEN PR Labelerシステム は 依存関係のインストール時間が10秒以内に完了しなければならない
4. WHEN 型ガード関数が大量に呼ばれるとき THEN PR Labelerシステム は メモリ使用量が大幅に増加してはならない
5. WHEN ビルドプロセスが実行されるとき THEN PR Labelerシステム は ビルド時間が既存と比較して20%以内の差でなければならない

### 要件10: エラーハンドリングの強化

**目的:** 開発者として、Valibotのバリデーションエラーを適切にハンドリングしたいので、デバッグしやすいエラーメッセージを提供できる

#### 受入基準

1. WHEN Valibotのバリデーションが失敗するとき THEN PR Labelerシステム は 詳細なエラーメッセージをログに出力しなければならない
2. WHEN Valibotのバリデーションが失敗するとき THEN PR Labelerシステム は どのプロパティが不正かを特定できなければならない
3. WHEN Valibotのバリデーションが失敗するとき THEN PR Labelerシステム は 期待される型と実際の型を表示しなければならない
4. IF バリデーションエラーがキャッチされたとき THEN PR Labelerシステム は Railway-Oriented Programming (Result型)でエラーを伝播しなければならない
5. WHEN バリデーションエラーが発生するとき THEN PR Labelerシステム は 適切なHTTPステータスコードまたはエラーコードを返さなければならない

### 要件11: スキーマ配置と命名規約

**目的:** 開発者として、Valibotスキーマの配置場所と命名規約を統一したいので、チーム全体で一貫した実装ができる

#### 受入基準

1. WHEN Valibotスキーマが作成されるとき THEN PR Labelerシステム は `src/schemas/errors.ts`にスキーマを配置しなければならない
2. WHEN Valibotスキーマが命名されるとき THEN PR Labelerシステム は `[TypeName]Schema`の命名規則に従わなければならない
3. WHEN 型推論型が公開されるとき THEN PR Labelerシステム は `export type [TypeName]Out = v.InferOutput<typeof [TypeName]Schema>`の形式でエクスポートしなければならない
4. WHEN スキーマファイルが作成されるとき THEN PR Labelerシステム は JSDocコメントでスキーマの目的と使用例を記載しなければならない
5. WHEN 列挙型の定義が必要なとき THEN PR Labelerシステム は `as const`アサーションで値集合を単一情報源として管理しなければならない

### 要件12: 未知キーの扱いポリシー

**目的:** 開発者として、スキーマで定義されていないプロパティの扱いを明確にしたいので、予期しない動作を防止できる

#### 受入基準

1. WHEN Valibotスキーマがバリデーションを実行するとき THEN PR Labelerシステム は strictモード（未知キー拒否）をデフォルトとしなければならない
2. IF 既存コードが未知プロパティを含む可能性があるとき THEN PR Labelerシステム は スキーマに全ての既知プロパティを`v.optional()`で明示的に定義しなければならない
3. WHEN バリデーションエラーが未知キーで発生するとき THEN PR Labelerシステム は どのキーが未知かをエラーメッセージに含めなければならない

## 制約事項

1. **バンドルサイズ制限**: Valibot導入によるバンドルサイズ増加は5KB以下に抑える必要がある
2. **後方互換性**: 既存のAPIシグネチャを変更してはならない
3. **パフォーマンス要件**: 実行時間とメモリ使用量が既存実装と大きく変わってはならない
4. **CommonJS互換性**: @vercel/ncc 0.40+を使用してCommonJS形式でバンドルできる必要がある
5. **テストカバレッジ**: 全体のテストカバレッジを90%以上維持する必要がある

## 非機能要件

### セキュリティ

- Valibotライブラリのバージョンは定期的に更新する
- 依存関係の脆弱性スキャンをCI/CDパイプラインに組み込む

### 保守性

- Valibotスキーマは型定義と同じファイルに配置する
- スキーマ定義にはTypeScriptのJSDocコメントを追加する
- 命名規則は`[TypeName]Schema`とする

### 拡張性

- 将来的に`src/config-loader.ts`や`src/labeler-types.ts`にもValibotを適用できるよう設計する
- スキーマのカスタムバリデーションロジックを追加できるようにする

## 成功指標

1. **メンテナンスコスト削減**: 型変更時の手動更新が不要になる
2. **バグ削減**: ランタイムバリデーションエラーの早期検出
3. **開発速度向上**: 型ガード関数の記述時間が50%削減される
4. **コード品質**: テストカバレッジが90%以上維持される
5. **CI/CD効率**: ビルド時間とバンドルサイズが許容範囲内に収まる

## 設計フェーズで明確化すべき事項

以下の設計判断事項は、要件フェーズでは決定せず、設計フェーズで具体化する必要があります。

### 1. スキーマimportの最適化戦略

- **検討事項**: 個別import（`import { object, string } from 'valibot'`）vs 名前空間import（`import * as v from 'valibot'`）
- **影響**: バンドルサイズとTree-shakingの効果
- **判断基準**: 10KB以下の制約を満たすために最も効果的な方法を選択

### 2. `reason`列挙値の型定義との整合性確保方法

- **検討事項**: `ComplexityAnalysisError`型の`reason`プロパティとValibotスキーマの`v.enum()`定義の単一情報源化
- **候補案**:
  - `as const`アサーションで定義し、型とスキーマで共有
  - 型定義からスキーマを生成
  - スキーマから型を推論
- **判断基準**: メンテナンス性と型安全性のバランス

### 3. `InferOutput`型と既存の`ComplexityAnalysisError`型の統合方針

- **検討事項**: 既存の`ComplexityAnalysisError`インターフェースを`InferOutput`型で置き換えるか、並行運用するか
- **候補案**:
  - スキーマ定義を真実の源泉にし、`export type ComplexityAnalysisError = v.InferOutput<typeof ComplexityAnalysisErrorSchema>`とする
  - 既存の型定義を維持し、スキーマを別途定義
- **判断基準**: 型の単一情報源化と後方互換性のバランス

### 4. バリデーションエラーのログ出力レベルとフォーマット

- **検討事項**: Valibotの`safeParse`失敗時のエラー情報をどのようにログに出力するか
- **候補案**:
  - `core.debug()`で詳細情報を出力
  - `core.warning()`で警告として出力
  - エラーメッセージに埋め込む
- **判断基準**: デバッグ効率とログの可読性

### 5. バンドルサイズ計測の自動化方法（CI統合）

- **検討事項**: CI/CDパイプラインでのバンドルサイズ回帰チェックの実装方法
- **候補案**:
  - GitHub Actionsのステップで`dist/index.js`のサイズを比較
  - `size-limit`などのツールを導入
  - カスタムスクリプトで計測
- **判断基準**: 実装コストと精度のバランス

### 6. 互換性テストの具体的なテストケース設計

- **検討事項**: 既存の手動型ガード関数と新しいValibot版の挙動一致を保証するテストケース
- **必須テストケース**:
  - 正常系: 全プロパティが正しい値の場合
  - 異常系: 必須プロパティ欠落、型不一致、null、undefined
  - 境界値: 空文字列、負数、巨大数値
  - 未知キー: 定義外のプロパティが含まれる場合
- **判断基準**: テストカバレッジと実装コストのバランス

### 7. スキーマ配置の詳細設計

- **検討事項**: `src/schemas/errors.ts`のファイル構造と公開インターフェース
- **候補案**:
  - 全エラー型スキーマを1ファイルに集約
  - エラー型ごとにファイルを分割（`src/schemas/complexity-analysis-error.ts`など）
- **判断基準**: ファイルサイズとメンテナンス性のバランス
