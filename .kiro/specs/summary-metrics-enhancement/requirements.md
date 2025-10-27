# Requirements Document

## Project Description (Input)

"Summary出力の除外ファイル内訳と解析件数表示を改善し、適用ラベル情報も併載する"

## Introduction

GitHub Actions Summary の Basic Metrics を拡張し、PR 全体の変更ファイル数と解析対象ファイル数の差異を明示します。また、除外ファイルが多いケースでも内訳を確認しやすいよう折りたたみ表示を導入し、さらに最終的に適用されたラベルを Summary からも確認できるようにします。これによりレビュアーは数値の乖離理由とラベリング結果を迅速に把握でき、デバッグやレビュー効率を高められます。

## Requirements

### Requirement 1: 総変更ファイル数と解析対象ファイル数の個別表示

**Objective:** As a レビュアー, I want Summary で PR 全体の変更ファイル数と解析対象ファイル数の両方を確認したい, so that 解析から除外されたファイル数の影響を瞬時に理解できる。

#### Acceptance Criteria

1. WHEN PR Metrics Summary の Basic Metrics セクションを表示する THEN Summary SHALL 総変更ファイル数 (`metrics.totalFiles`) を "Total Files Changed" 行に表示する。
2. WHEN PR Metrics Summary の Basic Metrics セクションを表示する THEN Summary SHALL 解析対象ファイル数 (`metrics.filesAnalyzed.length`) を新しい行 "Files Analyzed" として表示する。
3. WHEN Summary を日本語で表示する THEN Summary SHALL それぞれの行ラベルを対訳（例: "変更ファイル数", "解析対象ファイル数"）で表示する。
4. WHEN Summary を生成する THEN Summary SHALL 既存のコメント出力（Pull Request コメント）におけるメトリクス表示を破壊的変更なく維持する。

### Requirement 2: 除外ファイル一覧の折りたたみ表示

**Objective:** As a レビュアー, I want Summary で除外ファイルの具体的な一覧を折りたたみ表示で確認したい, so that 多数の除外ファイルがあっても視認性を保ちながら内訳を見られる。

#### Acceptance Criteria

1. IF `metrics.filesExcluded.length > 0` THEN Summary SHALL "Excluded Files (N)" という `<details><summary>` ブロックを出力し、中に除外ファイルのパス一覧を Markdown リストで表示する。
2. WHEN Summary を日本語で表示する THEN Summary SHALL details の summary 文言を日本語訳（例: "除外ファイル (N)"）で表示する。
3. WHEN 除外ファイル数が 10 件を超える THEN Summary SHALL 全件をリスト表示し、スクロールせずに確認できる Markdown 構造を維持する（折りたたみによるコンパクト表示）。
4. WHEN `metrics.filesExcluded.length === 0` THEN Summary SHALL `<details>` ブロックを出力しない。
5. WHEN Summary を生成する THEN Summary SHALL 除外ファイル一覧をコメント出力（PR コメント）へは影響を与えず、Summary のみで表示する。

### Requirement 3: 適用ラベル情報の表示

**Objective:** As a レビュアー, I want Summary で適用済みラベルの一覧を確認したい, so that コメントを開かなくても最終的なラベリング結果とデバッグ情報を把握できる。

#### Acceptance Criteria

1. IF `analysis.appliedLabels`（または同等のラベル配列）が 1 件以上存在する THEN Summary SHALL "Applied Labels" の見出しまたは行を追加し、ラベル名を一覧表示する。
2. WHEN ラベル一覧を表示する THEN Summary SHALL 英語および日本語双方の表示文言を i18n で提供する。
3. WHEN ラベルが存在しない場合 THEN Summary SHALL 当該セクションを出力しない、または "No labels applied" と翻訳済み文言を表示する（コメント出力と挙動を揃える）。
4. WHEN Summary にラベルセクションを追加する THEN Summary SHALL 既存のコメント出力とラベル情報の整合性を保つ（差異が出ないようにする）。

### Requirement 4: テストおよびスナップショット更新

**Objective:** As a 開発者, I want 自動テストとスナップショットが新仕様を検証することを期待する, so that 既存機能との回帰が発生しない。

#### Acceptance Criteria

1. WHEN Summary の Basic Metrics 表示仕様を変更する THEN Tests SHALL report-formatter および summary-writer 関連の単体テスト／スナップショットを更新し、新しい行表示と i18n を検証する。
2. WHEN ラベル表示仕様を追加する THEN Tests SHALL ラベルセクションを検証する英語／日本語のスナップショットを追加・更新する。
3. IF コメント生成のスナップショットに影響が出る場合 THEN Tests SHALL 当該スナップショットを更新し、Summary 専用の差分がコメントに波及していないことを確認する。
4. WHEN テストを実行する THEN Tests SHALL `pnpm test`, `pnpm lint`, `pnpm type-check`, `pnpm build` が成功することを確認する。

### Requirement 5: ログとドキュメントの整合性

**Objective:** As a ユーザー, I want Summary の仕様変更が設定やログと整合していることを期待する, so that 操作手順や解析ログから新しいメトリクス表示を理解できる。

#### Acceptance Criteria

1. WHEN 新しい Summary 表示を導入する THEN Documentation SHALL 該当する docs や README の Summary 説明を必要に応じて更新する。
2. WHEN Summary のメトリクス行が増える THEN Logs SHALL 必要に応じて英語／日本語の翻訳キーを追加・更新し、欠落警告を出力しないようにする。
3. WHEN Summary 出力が失敗した場合 THEN System SHALL 既存の警告ログフォーマットを維持し、新仕様によるエラーパスを追加しない。
4. WHEN Summary の構造変更を実施する THEN System SHALL PR Metrics size ラベル付与や既存フローの挙動に変更を加えない。

## Out of Scope

- Summary 以外（コメント出力や Slack 連携など）への UI 改善
- 除外ファイルパターンや設定項目そのものの変更
- 解析対象ファイルの定義ロジック（ファイルメトリクス計算）の見直し

## Open Questions

- 除外ファイルリストの表示順（現在の metrics.filesExcluded の順序を維持するか、ソートするか）を要確認。
- 除外ファイルが非常に長いパスのときの見切れ対策（幅調整など）が必要か要判断。
- 適用ラベル一覧に色やカテゴリー情報を併載する必要があるか（テキストのみで足りるか）を検討。
