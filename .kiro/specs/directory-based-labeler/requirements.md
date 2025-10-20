# 要件定義書

## イントロダクション

Directory-Based Labelerは、Pull Request内の変更ファイルのディレクトリパスに基づいて、自動的に対応するGitHubラベルを付与する機能です。この機能により、PRレビュアーは変更箇所を一目で把握でき、適切なレビュアーへのアサインやレビュープロセスの効率化が実現します。

### ビジネス価値

- **レビュー効率の向上**: ディレクトリラベルにより、変更箇所が明確化され、適切なレビュアーが迅速に特定できる
- **チーム協業の円滑化**: フロントエンド、バックエンド、インフラなど、チーム間の責任範囲が明確になる
- **自動化による運用負荷削減**: 手動でのラベル付けが不要になり、一貫性のあるラベリングが実現する
- **安全なデフォルト動作**: 明示的な設定なしでは動作しない安全設計により、誤ラベル付与を防止

## 要件

### 要件1: ディレクトリパスベースのラベルマッピング

**目的**: PRレビュアーとして、変更ファイルのディレクトリに基づいて自動的にラベルが付与されることで、変更箇所を一目で把握したい

#### 受け入れ基準

1. IF PRがドラフト状態 AND `skip_draft_pr`が`true` THEN Directory-Based Labeler SHALL ラベリング処理をスキップして正常終了する
2. IF PRの変更ファイル数が0（削除のみ等） THEN Directory-Based Labeler SHALL ラベルを変更せずに正常終了する
3. WHEN PRに変更ファイルが含まれる THEN Directory-Based Labeler SHALL リポジトリルートを基準とした相対パスで各ファイルのディレクトリパスを抽出する
4. WHEN ファイルがリネームまたは移動されている THEN Directory-Based Labeler SHALL 新パス（移動先パス）を判定対象とする
5. WHEN ファイルパスが設定されたパターンにマッチする THEN Directory-Based Labeler SHALL 対応するラベル名を決定する
6. WHERE 複数のディレクトリに変更がある THE Directory-Based Labeler SHALL すべてのマッチしたラベルを収集し重複を除去する
7. IF 既にPRに同じラベルが付与されている THEN Directory-Based Labeler SHALL 重複したラベル適用APIを呼び出さない（冪等性）
8. IF ラベルが新たに決定される THEN Directory-Based Labeler SHALL GitHub APIを使用してPRにラベルを適用する
9. WHEN ラベル適用が完了する THEN Directory-Based Labeler SHALL 適用されたラベルの一覧と決定根拠（マッチパターン）をログに出力する

### 要件2: 柔軟な設定管理

**目的**: プロジェクト管理者として、プロジェクト固有のディレクトリ構造に応じてラベルマッピングをカスタマイズしたい

#### 受け入れ基準

1. WHEN Directory-Based Labelerが起動する AND `directory_labeler_config_path`が指定されている THEN Directory-Based Labeler SHALL 指定されたパスから設定を読み込む
2. WHEN Directory-Based Labelerが起動する AND `directory_labeler_config_path`が未指定 THEN Directory-Based Labeler SHALL `.github/directory-labeler.yml`から設定を読み込む
3. IF 設定ファイルが存在しない THEN Directory-Based Labeler SHALL 空のマッピングルール（デフォルト無効）を使用してラベルを付与せずに正常終了する
4. WHERE 設定ファイルにマッピングルールが定義されている THE Directory-Based Labeler SHALL パターンマッチングでディレクトリを識別する
5. WHEN 設定ファイルが不正なフォーマット（必須キー欠落、型不一致、重複ラベル定義等） THEN Directory-Based Labeler SHALL 具体的なエラー箇所と修正方法を含むConfigErrorを返す
6. IF 設定ファイルにYAMLアンカー/エイリアスが使用されている THEN Directory-Based Labeler SHALL 安全モード（`yaml.load` + `DEFAULT_SCHEMA`）でパースし、YAMLアンカー/エイリアスとマージキー（`<<:`）をサポートする。任意コード実行は許可しない
7. WHEN 設定ファイルが正常に読み込まれる THEN Directory-Based Labeler SHALL バージョン、オプション、ルール、名前空間ポリシーを抽出してバリデーションする

### 要件3: パターンマッチングと除外ルール

**目的**: プロジェクト管理者として、特定のディレクトリやファイルパターンを除外してラベル付けの精度を向上させたい

#### 受け入れ基準

1. WHEN ディレクトリマッピング設定にglobパターンが含まれる THEN Directory-Based Labeler SHALL minimatchライブラリを使用してパターンマッチングを実行する
2. WHEN minimatchが初期化される THEN Directory-Based Labeler SHALL 以下のオプションを適用する: `dot: true`（`.github`等の隠しディレクトリを対象に含める）、`nocase: false`（大文字小文字を区別、Windowsはパス正規化で対応）、`matchBase: false`（ベース名のみマッチを無効）
3. WHERE パス区切り文字のOS差異が存在する THE Directory-Based Labeler SHALL すべてのパスを`/`（POSIXスタイル）に正規化してからパターンマッチングを実行する
4. WHEN ファイルパスが評価される THEN Directory-Based Labeler SHALL 除外パターンを優先評価し、マッチした場合は短絡評価で候補から除外する
5. WHERE 除外パターンにマッチしないファイルが存在する THE Directory-Based Labeler SHALL includeパターンに一致する候補を収集する
6. IF ファイルが複数のincludeパターンにマッチする THEN Directory-Based Labeler SHALL 以下の優先順位で決定する: (1) 明示的`priority`の降順 → (2) 最長マッチ長の降順 → (3) 設定ファイル内の定義順
7. WHEN 除外パターンにマッチするファイルのみが変更されている THEN Directory-Based Labeler SHALL ラベルを付与せずに正常終了する

### 要件4: 既存システムとの統合

**目的**: 開発者として、既存のPR Metrics Actionの機能を損なうことなく、新しいラベリング機能を利用したい

#### 受け入れ基準

1. WHEN Directory-Based Labelerが実行される THEN Directory-Based Labeler SHALL 既存の`diff-strategy.ts`モジュールを再利用してファイルリストを取得する
2. WHERE 既存の`label-manager.ts`が存在する THE Directory-Based Labeler SHALL 同じGitHub APIクライアント（Octokit）を共有する
3. IF ラベルを適用する前 THEN Directory-Based Labeler SHALL 現在のPRラベル一覧を取得して既存ラベルを確認する
4. WHERE 名前空間ポリシーが定義されている THE Directory-Based Labeler SHALL `exclusive`（相互排他）名前空間では同一名前空間の既存ラベルを削除し新ラベルで置換する
5. WHERE 名前空間ポリシーが定義されている THE Directory-Based Labeler SHALL `additive`（加法的）名前空間では既存ラベルを保持し新ラベルを追加する
6. WHEN 名前空間ポリシーが未定義 THEN Directory-Based Labeler SHALL デフォルトとして`exclusive: ["size", "area", "type"]`、`additive: ["scope", "meta"]`を適用する
7. IF 複数のラベリング機能が同時実行される THEN Directory-Based Labeler SHALL 差分のみを適用（必要な追加/削除のみ）し、冪等性を保証する
8. WHEN 他ワークフローとの並行実行が発生する THEN Directory-Based Labeler SHALL 同一ラベルの重複APIコールを避けるため、単一の`addLabels`呼び出しと必要時のみの`removeLabel`呼び出しに集約する
9. WHEN 既存のPR Metrics機能が無効化されている THEN Directory-Based Labeler SHALL 独立して動作する

### 要件5: エラーハンドリングとロギング

**目的**: 開発者として、ラベリング処理のエラーを適切に把握し、デバッグを容易にしたい

#### 受け入れ基準

1. WHEN エラーが発生する THEN Directory-Based Labeler SHALL neverthrowの`Result<T, E>`型でエラーを返す
2. WHERE エラーが分類される THE Directory-Based Labeler SHALL 以下のエラー型を使用する: `ConfigError`（設定エラー）、`PatternError`（パターンマッチエラー）、`GitHubApiError`（API呼び出しエラー）、`PermissionError`（権限不足）、`RateLimitError`（レート制限）、`UnexpectedError`（予期しないエラー）
3. WHERE GitHub API呼び出しが失敗する THE Directory-Based Labeler SHALL HTTPステータスコード、エラーメッセージ、レスポンスボディをログに記録する
4. IF 設定ファイルの読み込みに失敗する THEN Directory-Based Labeler SHALL ファイルパス、エラー行番号（YAMLパースエラーの場合）、具体的な修正方法をエラーメッセージに含める
5. WHEN ログを出力する THEN Directory-Based Labeler SHALL トークン、URL（リポジトリ情報を含む場合）、個人識別子をマスキングする
6. WHERE ログレベルが使用される THE Directory-Based Labeler SHALL 以下の規約に従う: `debug`（パターンマッチ詳細）、`info`（ラベル適用結果）、`warn`（部分失敗）、`error`（致命的エラー）
7. WHEN ラベル適用が部分的に失敗する THEN Directory-Based Labeler SHALL 成功したラベル、失敗したラベル、失敗理由を区別してログとGitHub Actions Summaryに出力する
8. IF 致命的なエラーが発生する THEN Directory-Based Labeler SHALL GitHub Actions Coreの`setFailed()`を呼び出してワークフローを失敗させる

### 要件6: GitHub Actions統合

**目的**: DevOpsエンジニアとして、既存のGitHub Actionsワークフローに簡単に統合できるようにしたい

#### 受け入れ基準

1. WHEN Directory-Based Labelerが`action.yml`から呼び出される THEN Directory-Based Labeler SHALL 以下の入力パラメータを受け付ける:
   - `enable_directory_labeling` (boolean, デフォルト: `false`): 機能の有効/無効
   - `directory_labeler_config_path` (string, デフォルト: `.github/directory-labeler.yml`): 設定ファイルパス
   - `auto_create_labels` (boolean, デフォルト: `false`): ラベル未存在時の自動作成
   - `label_color` (string, デフォルト: `#cccccc`): 自動作成ラベルの色
   - `label_description` (string, デフォルト: `""`): 自動作成ラベルの説明
   - `max_labels` (number, デフォルト: `10`): 適用ラベル数の上限
   - `use_default_excludes` (boolean, デフォルト: `true`): デフォルト除外パターンの使用
2. IF `enable_directory_labeling`がfalse THEN Directory-Based Labeler SHALL ラベリング処理をスキップして正常終了する
3. WHERE `directory_labeler_config_path`が指定されている THE Directory-Based Labeler SHALL 指定されたパスから設定ファイルを読み込む
4. WHEN 決定されたラベル数が`max_labels`を超過する THEN Directory-Based Labeler SHALL 優先度順（priority → 最長マッチ → 定義順）で上位N件のみ適用し、非採用ラベルと理由（上限超過）をSummary/ログに出力する
5. WHEN `auto_create_labels`が`true` AND ラベルが未存在 THEN Directory-Based Labeler SHALL 新規ラベルを作成し、`label_color`と`label_description`を適用する
6. IF ラベル作成に失敗する（権限不足/レート制限） THEN Directory-Based Labeler SHALL 部分失敗として記録し、Summary/ログに失敗理由を出力する
7. WHEN ラベル適用にGitHub APIを使用する THEN Directory-Based Labeler SHALL `issues: write`権限を必要とし、権限が不足している場合は`PermissionError`を返す
8. IF `issues: write`権限が不足している THEN Directory-Based Labeler SHALL READMEと`action.yml`で必要権限を明記し、エラーメッセージで設定方法を案内する
9. WHEN ラベル適用が完了する THEN Directory-Based Labeler SHALL GitHub Actions Summaryに以下の列を含むテーブルを出力する: ラベル名、決定根拠（マッチパターン）、対象ファイル数、処理結果（applied/skipped/failed）、失敗理由（該当時: 上限超過/権限不足/レート制限/その他）
10. WHERE GitHub Actions Summaryが出力される THE Directory-Based Labeler SHALL 既存の「actions-summary-output」仕様に従い、`summary.addTable()`でフォーマットされたセクションを追加する
11. IF Summary出力が失敗する THEN Directory-Based Labeler SHALL エラーログを記録するが、ラベリング処理の成功/失敗には影響しない（非致命的）

### 要件7: テスタビリティと保守性

**目的**: 開発者として、高いテストカバレッジと保守性を確保したい

#### 受け入れ基準

1. WHEN Directory-Based Labelerの各モジュールが作成される THEN Directory-Based Labeler SHALL 対応する`*.test.ts`ファイルをテストディレクトリに配置する
2. WHERE 外部依存（GitHub API、ファイルシステム）が存在する THE Directory-Based Labeler SHALL 依存性注入パターンを使用してテスタビリティを確保する
3. IF 単体テストが実行される THEN Directory-Based Labeler SHALL モックを使用して外部依存を排除する
4. WHEN テストカバレッジが計測される THEN Directory-Based Labeler SHALL 90%以上のカバレッジを達成する
5. WHERE テスト観点が定義される THE Directory-Based Labeler SHALL 以下の観点を網羅する: OS差異（Windows/Mac/Linux）、パス正規化（`\` → `/`）、minimatchオプション組み合わせ（`dot`/`nocase`）、重複パターン、競合パターン、除外のみ変更、リネーム/削除、既存ラベル競合、権限不足、レート制限
6. IF E2Eテストが実装される THEN Directory-Based Labeler SHALL コスト対効果を考慮してユニットテスト中心、インテグレーションテスト最小限の戦略を採用する

### 要件8: 設定スキーマ仕様

**目的**: プロジェクト管理者として、設定ファイルの構造とバリデーションルールを明確に理解したい

#### 受け入れ基準

1. WHEN 設定ファイルが作成される THEN Directory-Based Labeler SHALL 以下のYAML構造をサポートする:

   ```yaml
   version: 1  # スキーマバージョン（必須、整数）
   options:    # minimatchオプション（省略可）
     dot: true           # 隠しファイル/ディレクトリをマッチ対象に含める（デフォルト: true）
     nocase: false       # 大文字小文字を区別（デフォルト: false）
     matchBase: false    # ベース名のみマッチを無効（デフォルト: false）
     pathSeparator: "/"  # パス区切り文字（固定値）
   rules:      # ラベルマッピングルール（必須、配列）
     - label: "area:components"  # ラベル名（必須、文字列）
       include:                  # includeパターン（必須、配列）
         - "src/components/**"
       exclude:                  # excludeパターン（省略可、配列）
         - "src/components/**/__tests__/**"
       priority: 50              # 優先度（省略可、整数、大きいほど優先）
   namespaces: # 名前空間ポリシー（省略可）
     exclusive: ["size", "area", "type"]  # 相互排他（置換）
     additive: ["scope", "meta"]          # 加法的（追加）
   ```

2. IF `version`フィールドが欠落または1以外 THEN Directory-Based Labeler SHALL ConfigErrorを返す
3. IF `rules`フィールドが欠落または空配列 THEN Directory-Based Labeler SHALL ConfigErrorを返す
4. WHEN ルール内の`label`フィールドが欠落 THEN Directory-Based Labeler SHALL 該当ルールのインデックスを含むConfigErrorを返す
5. WHEN ルール内の`include`フィールドが欠落または空配列 THEN Directory-Based Labeler SHALL 該当ルールのインデックスを含むConfigErrorを返す
6. IF 同一ラベル名が複数のルールで定義されている THEN Directory-Based Labeler SHALL 最初の定義を優先し、警告ログを出力する
7. WHERE `namespaces`フィールドが省略されている THE Directory-Based Labeler SHALL デフォルト値（`exclusive: ["size", "area", "type"]`, `additive: ["scope", "meta"]`）を使用する

### 要件9: 競合解決とパターン優先順位

**目的**: 開発者として、複数のパターンが競合した場合の決定ロジックを予測可能にしたい

#### 受け入れ基準

1. WHEN ファイルパスが評価される THEN Directory-Based Labeler SHALL 以下のアルゴリズムでラベルを決定する:
   - ステップ1: 除外パターンにマッチすれば不採用（短絡評価）
   - ステップ2: includeパターンにマッチする候補を収集
   - ステップ3: 明示的`priority`が設定されている候補を降順でソート
   - ステップ4: 同一`priority`の場合、最長マッチ長（マッチした文字列の長さ）の降順でソート
   - ステップ5: なお同一の場合、設定ファイル内の定義順で決定
2. WHEN 複数のラベルが決定される THEN Directory-Based Labeler SHALL ラベル名の重複を除去して集合として管理する
3. WHERE 名前空間ポリシーが適用される THE Directory-Based Labeler SHALL `exclusive`名前空間では同一名前空間内の最新決定のみを保持し、既存ラベルと置換する
4. WHERE 名前空間ポリシーが適用される THE Directory-Based Labeler SHALL `additive`名前空間では既存ラベルを保持し、新ラベルを追加する
5. IF 名前空間が未定義のラベル THEN Directory-Based Labeler SHALL `additive`として扱う
6. WHEN GitHub APIにラベルを適用する THEN Directory-Based Labeler SHALL 追加と削除の差分を計算し、必要な操作のみを実行する

## 受け入れテストケース（主要シナリオ）

### シナリオ1: 単一マッチ

- **入力**: `src/components/Button.tsx`が変更
- **設定**: `src/components/**` → `area:components`
- **期待結果**: `area:components`ラベルが付与される

### シナリオ2: 複数マッチ（加法的）

- **入力**: `src/components/Button.tsx`と`src/utils/format.ts`が変更
- **設定**: `src/components/**` → `area:components`, `src/utils/**` → `area:utils`
- **期待結果**: `area:components`と`area:utils`の両方が付与される

### シナリオ3: 競合（相互排他）

- **入力**: PR追加行数が600行
- **既存**: `size:S`ラベルが存在
- **設定**: 500-1000行 → `size:M`（exclusive名前空間）
- **期待結果**: `size:S`が削除され、`size:M`が付与される

### シナリオ4: 除外優先

- **入力**: `src/components/__tests__/Button.test.tsx`が変更
- **設定**: `src/components/**` → `area:components`, exclude: `**/__tests__/**`
- **期待結果**: ラベルは付与されない

### シナリオ5: 除外のみ変更

- **入力**: すべての変更ファイルが除外パターンにマッチ
- **期待結果**: ラベルは変更されず、正常終了

### シナリオ6: リネーム対応

- **入力**: `src/old/A.ts` → `src/new/A.ts`へリネーム
- **設定**: `src/new/**` → `area:new`
- **期待結果**: `area:new`ラベルが付与される（新パスで判定）

### シナリオ7: 既存ラベル重複（冪等性）

- **入力**: `src/components/Button.tsx`が変更
- **既存**: `area:components`ラベルが既に存在
- **期待結果**: ラベル追加APIは呼び出されない（冪等）

### シナリオ8: 権限不足

- **入力**: `issues: write`権限がない
- **期待結果**: `PermissionError`を返し、`setFailed()`が呼び出される

### シナリオ9: レート制限

- **入力**: GitHub APIがHTTP 429を返す
- **期待結果**: `RateLimitError`を返し、エラーログとSummaryに記録

### シナリオ10: パターン優先度

- **入力**: `src/components/core/Button.tsx`が変更
- **設定**: `src/components/**` (priority: 10) → `area:components`, `src/components/core/**` (priority: 50) → `area:core`
- **期待結果**: `area:core`が選択される（優先度: 50 > 10）

### シナリオ11: max_labels超過時のフィルタリング

- **入力**: 複数のディレクトリで15個のラベルが決定される
- **設定**: `max_labels: 10`
- **期待結果**: 優先度順（priority → 最長マッチ → 定義順）で上位10個のみ適用され、非採用5個の理由（上限超過）がSummary/ログに記録される

### シナリオ12: auto_create_labels機能の動作

- **入力**: `src/new-module/index.ts`が変更、`area:new-module`ラベルが未存在
- **設定**: `auto_create_labels: true`, `label_color: #ff0000`, `label_description: "New module"`
- **期待結果**: `area:new-module`ラベルが自動作成され（色: #ff0000、説明: "New module"）、PRに適用される

### シナリオ13: auto_create_labels作成失敗

- **入力**: `src/feature/A.ts`が変更、`area:feature`ラベルが未存在、権限不足
- **設定**: `auto_create_labels: true`
- **期待結果**: ラベル作成が失敗し、部分失敗として記録され、Summary/ログに失敗理由（権限不足）が出力される

### シナリオ14: 既定除外のみ変更

- **入力**: `.git/config`と`node_modules/package/index.js`のみ変更
- **設定**: `use_default_excludes: true`
- **期待結果**: ラベルは付与されず、正常終了

## 非機能要件

### パフォーマンス

- ファイル数1000件以下のPRでラベリング処理を5秒以内に完了する
- パターン事前コンパイル: minimatchパターンは設定読み込み時に一度だけコンパイルする
- 二段階評価: ファイルごとに除外チェック → includeマッチ探索の順で評価し、除外時は短絡
- GitHub API最適化: 現在ラベル取得1回、追加/削除は差分のみで各1回まで

### セキュリティ

- GitHub Tokenは環境変数またはGitHub Actions Secretsから安全に取得する
- YAMLパーサは安全モード（`yaml.load` + `DEFAULT_SCHEMA`）を使用し、YAMLアンカー/エイリアス、マージキーをサポートするが任意コード実行を許可しない
- 設定ファイルの読み込み時にYAMLインジェクション攻撃を防ぐ
- ログ出力時にトークン、URL、個人識別子をマスキングする

### 互換性

- Node.js 20以上で動作する
- 既存のPR Metrics Action v1.x系と互換性を保つ（入力パラメータ、環境変数の非衝突）
- TypeScript 5.9以上でビルドする
- Windows、Mac、Linuxの各OSで動作する（パス正規化により差異を吸収）

### 保守性

- Railway-Oriented Programmingパターンを遵守する
- `any`型を使用せず、型安全性を徹底する（`LabelRule`, `MatchContext`, `Decision`等の明確な型定義）
- ESLintおよびPrettierのルールに準拠する
- 各モジュールは単一責任原則に従い、明確な境界を持つ

### 観測可能性

- すべてのラベリング決定にトレーサビリティを持たせる（どのパターンがマッチしたか）
- 部分失敗時は成功/失敗を明確に区別してログとSummaryに記録
- デバッグ用に詳細ログレベル（`debug`）を提供
