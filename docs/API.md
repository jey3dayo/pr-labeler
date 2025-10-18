# API仕様書

PR Metrics Actionの詳細なAPI仕様書です。

## 📥 Inputs

### 基本制限パラメータ

#### `file_size_limit`

- **型**: `string`
- **必須**: ❌
- **デフォルト**: `"100KB"`
- **説明**: 個別ファイルのサイズ上限
- **フォーマット**: 数値 + 単位（B, KB, MB, GB）または数値のみ（バイト）
- **バリデーション**:
  - 単位は大文字小文字を区別しない
  - 複数の単位を含む場合はエラー（例: `"10KB 20MB"`）
  - 負の値は不可
- **使用例**:
  ```yaml
  file_size_limit: "100KB"    # 100キロバイト
  file_size_limit: "1.5MB"    # 1.5メガバイト
  file_size_limit: "500000"   # 500,000バイト
  ```

#### `file_lines_limit`

- **型**: `string`
- **必須**: ❌
- **デフォルト**: `"500"`
- **説明**: 個別ファイルの行数上限（ファイル全体の行数、diff追加行数ではない）
- **バリデーション**:
  - 正の整数のみ
  - 非数値はエラー
- **使用例**:
  ```yaml
  file_lines_limit: "500"
  file_lines_limit: "1000"
  ```

#### `pr_additions_limit`

- **型**: `string`
- **必須**: ❌
- **デフォルト**: `"5000"`
- **説明**: PR全体の追加行数上限（diff-based、削除行数は含まない）
- **バリデーション**: 正の整数のみ
- **使用例**:
  ```yaml
  pr_additions_limit: "5000"
  pr_additions_limit: "1000"
  ```

#### `pr_files_limit`

- **型**: `string`
- **必須**: ❌
- **デフォルト**: `"50"`
- **説明**: PR内の最大ファイル数（削除されたファイルは除く）
- **バリデーション**: 正の整数のみ
- **使用例**:
  ```yaml
  pr_files_limit: "50"
  pr_files_limit: "100"
  ```

---

### ラベル設定パラメータ

#### `apply_labels`

- **型**: `string` (boolean)
- **必須**: ❌
- **デフォルト**: `"true"`
- **説明**: 自動ラベル適用の有効/無効
- **受け入れ値**: `"true"`, `"false"`, `"1"`, `"0"`, `"yes"`, `"no"`, `"on"`, `"off"` (大文字小文字を区別しない)
- **使用例**:
  ```yaml
  apply_labels: "true"   # ラベル自動適用を有効化
  apply_labels: "false"  # ラベル自動適用を無効化
  ```

#### `auto_remove_labels`

- **型**: `string` (boolean)
- **必須**: ❌
- **デフォルト**: `"true"`
- **説明**: 制限違反が解消された際に自動的にラベルを削除
- **使用例**:
  ```yaml
  auto_remove_labels: "true"
  ```

#### `apply_size_labels`

- **型**: `string` (boolean)
- **必須**: ❌
- **デフォルト**: `"true"`
- **説明**: サイズラベル（size/S, size/M, size/L, size/XL, size/XXL）の適用
- **使用例**:
  ```yaml
  apply_size_labels: "true"
  ```

#### `size_label_thresholds`

- **型**: `string` (JSON)
- **必須**: ❌
- **デフォルト**: `'{"S": {"additions": 100, "files": 10}, "M": {"additions": 500, "files": 30}, "L": {"additions": 1000, "files": 50}}'`
- **説明**: サイズラベルの閾値設定（JSON形式）
- **バリデーション**:
  - S, M, Lの3つのサイズが必須
  - 各サイズに`additions`と`files`フィールドが必須
  - 値は非負の整数
  - 単調性: S ≤ M ≤ L（additionsとfilesそれぞれで）
- **使用例**:
  ```yaml
  size_label_thresholds: '{"S": {"additions": 50, "files": 5}, "M": {"additions": 200, "files": 15}, "L": {"additions": 500, "files": 30}}'
  ```
- **エラーパターン**:
  - 必須フィールド欠如: `Missing required size thresholds (S, M, L)`
  - 単調性違反: `Size thresholds must be monotonic (S ≤ M ≤ L for additions)`
  - 負の値: `Threshold values for size S must be non-negative`

#### `large_files_label`

- **型**: `string`
- **必須**: ❌
- **デフォルト**: `"auto:large-files"`
- **説明**: ファイルサイズまたは行数制限違反時に適用されるラベル
- **使用例**:
  ```yaml
  large_files_label: "auto:large-files"
  large_files_label: "needs-splitting"
  ```

#### `too_many_files_label`

- **型**: `string`
- **必須**: ❌
- **デフォルト**: `"auto:too-many-files"`
- **説明**: ファイル数制限違反時に適用されるラベル
- **使用例**:
  ```yaml
  too_many_files_label: "auto:too-many-files"
  too_many_files_label: "too-large-pr"
  ```

---

### 動作設定パラメータ

#### `skip_draft_pr`

- **型**: `string` (boolean)
- **必須**: ❌
- **デフォルト**: `"true"`
- **説明**: Draft PRをスキップ（分析を実行しない）
- **使用例**:
  ```yaml
  skip_draft_pr: "true"   # Draft PRをスキップ
  skip_draft_pr: "false"  # Draft PRも分析
  ```

#### `comment_on_pr`

- **型**: `string` (enum)
- **必須**: ❌
- **デフォルト**: `"auto"`
- **説明**: コメント投稿モード
- **受け入れ値**:
  - `"auto"`: 違反がある場合のみコメント投稿、違反解消時は削除
  - `"always"`: 常にコメント投稿
  - `"never"`: コメント投稿しない（既存コメントは削除）
- **使用例**:
  ```yaml
  comment_on_pr: "auto"     # 違反時のみコメント
  comment_on_pr: "always"   # 常にコメント
  comment_on_pr: "never"    # コメントなし
  ```

#### `fail_on_violation`

- **型**: `string` (boolean)
- **必須**: ❌
- **デフォルト**: `"false"`
- **説明**: 違反検出時にワークフローを失敗させる（`core.setFailed`を呼び出す）
- **使用例**:
  ```yaml
  fail_on_violation: "true"   # 違反時にCIを失敗させる
  fail_on_violation: "false"  # 違反時も継続（ラベル・コメントのみ）
  ```

#### `enable_summary`

- **型**: `string` (boolean)
- **必須**: ❌
- **デフォルト**: `"true"`
- **説明**: GitHub Actions SummaryにPRメトリクスを出力
- **動作**:
  - `"true"`: 分析結果をActions Summaryに表示
  - `"false"`: Summary出力をスキップ
- **使用例**:
  ```yaml
  enable_summary: "true"   # Summary出力を有効化（デフォルト）
  enable_summary: "false"  # Summary出力を無効化
  ```
- **注意**:
  - Summary書き込み失敗は非致命的エラー（警告ログのみ、アクション継続）
  - ラベル・コメント機能とは独立して動作

---

### 除外設定パラメータ

#### `additional_exclude_patterns`

- **型**: `string`
- **必須**: ❌
- **デフォルト**: `""`
- **説明**: デフォルト除外パターンに追加する除外パターン
- **フォーマット**: カンマ区切りまたは改行区切り
- **パターン構文**: minimatch（glob）
- **特殊処理**:
  - `#`で始まる行はコメントとして無視
  - 空白行は無視
  - 重複パターンは自動削除
- **使用例**:
  ```yaml
  additional_exclude_patterns: "**/*.generated.ts,**/*.min.js"
  ```
  ```yaml
  additional_exclude_patterns: |
    # 生成ファイル
    **/*.generated.ts
    **/*.gen.ts
    # 最小化ファイル
    **/*.min.js
    **/*.min.css
  ```

---

### 認証パラメータ

#### `github_token`

- **型**: `string`
- **必須**: ✅
- **説明**: GitHub API認証トークン
- **優先順位**: `github_token`入力 > `GITHUB_TOKEN`環境変数 > `GH_TOKEN`環境変数
- **権限要件**:
  - `pull-requests: write` - ラベル管理用
  - `issues: write` - コメント投稿用
  - `contents: read` - ファイル読み取り用
- **使用例**:
  ```yaml
  github_token: ${{ secrets.GITHUB_TOKEN }}
  ```
- **エラーパターン**:
  - トークン未設定: `GitHub token is required. Set github_token input or GITHUB_TOKEN/GH_TOKEN environment variable`

---

## 📤 Outputs

### `large_files`

- **型**: `string` (JSON array)
- **説明**: サイズまたは行数制限を超過したファイルの詳細情報
- **構造**:
  ```json
  [
    {
      "file": "src/large.ts",
      "actualValue": 2000000,
      "limit": 1000000,
      "violationType": "size",
      "severity": "critical"
    }
  ]
  ```
- **使用例**:
  ```yaml
  - name: Check large files
    if: steps.metrics.outputs.large_files != '[]'
    run: echo "Large files detected: ${{ steps.metrics.outputs.large_files }}"
  ```

### `pr_additions`

- **型**: `string`
- **説明**: PR全体の総追加行数（diff-based）
- **例**: `"1523"`

### `pr_files`

- **型**: `string`
- **説明**: PR内の総ファイル数（削除されたファイルは除く）
- **例**: `"42"`

### `exceeds_file_size`

- **型**: `string` (`"true"` | `"false"`)
- **説明**: いずれかのファイルがサイズ制限を超過しているか
- **使用例**:
  ```yaml
  - name: Notify on large files
    if: steps.metrics.outputs.exceeds_file_size == 'true'
    run: echo "⚠️ Large files detected!"
  ```

### `exceeds_file_lines`

- **型**: `string` (`"true"` | `"false"`)
- **説明**: いずれかのファイルが行数制限を超過しているか

### `exceeds_additions`

- **型**: `string` (`"true"` | `"false"`)
- **説明**: PR全体の追加行数が制限を超過しているか

### `exceeds_file_count`

- **型**: `string` (`"true"` | `"false"`)
- **説明**: PRのファイル数が制限を超過しているか

### `has_violations`

- **型**: `string` (`"true"` | `"false"`)
- **説明**: いずれかの違反が存在するか（上記すべての論理和）
- **使用例**:
  ```yaml
  - name: Block merge on violations
    if: steps.metrics.outputs.has_violations == 'true'
    run: exit 1
  ```

---

## 🚨 エラーパターンと対処法

### ConfigurationError

設定パラメータの検証エラー

**一般的なエラー**:

1. **ファイルサイズ解析失敗**:

   ```
   [ConfigurationError] Invalid file size format: '10KB 20MB'.
   Multiple units detected. Use single value like '10KB' or '20MB'
   ```

   **対処**: 単一の値のみを指定

2. **数値解析失敗**:

   ```
   [ConfigurationError] File lines limit must be a number
   ```

   **対処**: 数値文字列を指定（例: `"500"`）

3. **トークン未設定**:
   ```
   [ConfigurationError] GitHub token is required.
   Set github_token input or GITHUB_TOKEN/GH_TOKEN environment variable
   ```
   **対処**: `github_token`を明示的に設定

### ParseError

JSON解析・検証エラー

**一般的なエラー**:

1. **JSON構文エラー**:

   ```
   [ParseError] Invalid JSON for size thresholds
   ```

   **対処**: 有効なJSON構文を使用

2. **必須フィールド欠如**:

   ```
   [ParseError] Missing required size thresholds (S, M, L)
   ```

   **対処**: S, M, Lすべてを含める

3. **単調性違反**:
   ```
   [ParseError] Size thresholds must be monotonic (S ≤ M ≤ L for additions)
   ```
   **対処**: S ≤ M ≤ Lの順序を保つ

### GitHubAPIError

GitHub API呼び出しエラー

**一般的なエラー**:

1. **権限不足**:

   ```
   [GitHubAPIError] Failed to update labels: Resource not accessible by integration
   ```

   **対処**: workflowに適切な`permissions`を設定

2. **レート制限**:

   ```
   [GitHubAPIError] API rate limit exceeded
   ```

   **対処**: リトライまたは実行頻度を調整

3. **ネットワークエラー**:
   ```
   [GitHubAPIError] Failed to fetch diff files: Network error
   ```
   **対処**: リトライまたはGitHub Statusを確認

### FileAnalysisError

ファイル分析エラー（非致命的）

**一般的なエラー**:

1. **ファイル読み取り失敗**:

   ```
   [FileAnalysisError] Failed to read file src/test.ts: ENOENT
   ```

   **対処**: ファイルは`filesWithErrors`にリストされ、分析は継続

2. **行数カウント失敗**:
   ```
   [FileAnalysisError] Failed to count lines in src/binary.dat
   ```
   **対処**: バイナリファイルは自動スキップ、分析は継続

---

## 💡 使用例とベストプラクティス

### 基本的な使用パターン

#### 1. シンプル設定（推奨）

```yaml
- uses: jey3dayo/pr-metrics-action@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
```

**動作**:

- デフォルト制限値を使用
- 違反時のみコメント投稿（`comment_on_pr: auto`）
- サイズラベル自動適用
- GitHub Actions Summaryに出力
- 違反時もワークフローは継続

#### 2. カスタム制限

```yaml
- uses: jey3dayo/pr-metrics-action@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    file_size_limit: "200KB"
    file_lines_limit: "800"
    pr_additions_limit: "2000"
    pr_files_limit: "30"
```

#### 3. 厳格モード

```yaml
- uses: jey3dayo/pr-metrics-action@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    file_size_limit: "100KB"
    file_lines_limit: "300"
    pr_additions_limit: "500"
    fail_on_violation: "true"      # 違反時にCI失敗
    comment_on_pr: "always"        # 常にコメント
```

#### 4. Summary出力のみ

```yaml
- uses: jey3dayo/pr-metrics-action@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    apply_labels: "false"
    comment_on_pr: "never"
    enable_summary: "true"         # Summaryのみ
```

### 高度な使用パターン

#### 1. Slack通知との連携

```yaml
- name: Check PR Metrics
  id: metrics
  uses: jey3dayo/pr-metrics-action@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}

- name: Notify Slack on violations
  if: steps.metrics.outputs.has_violations == 'true'
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "⚠️ PR ${{ github.event.pull_request.number }} has violations",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "Additions: ${{ steps.metrics.outputs.pr_additions }}\nFiles: ${{ steps.metrics.outputs.pr_files }}"
            }
          }
        ]
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

#### 2. 条件付きマージブロック

```yaml
- name: Check PR Metrics
  id: metrics
  uses: jey3dayo/pr-metrics-action@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}

- name: Check for critical violations
  if: steps.metrics.outputs.exceeds_file_size == 'true'
  run: |
    echo "::error::Critical file size violations detected"
    exit 1
```

#### 3. カスタム除外パターン（モノレポ対応）

```yaml
- uses: jey3dayo/pr-metrics-action@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    additional_exclude_patterns: |
      # プロジェクトA
      packages/project-a/generated/**
      packages/project-a/**/*.spec.ts
      # プロジェクトB
      packages/project-b/migrations/**
      # 共通
      **/fixtures/**
      **/__mocks__/**
```

#### 4. フォークからのPR（セキュリティ考慮）

```yaml
on:
  pull_request_target:
    types: [opened, synchronize, reopened]

jobs:
  metrics:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      issues: write
      contents: read
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}

      - uses: jey3dayo/pr-metrics-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

**注意**: `pull_request_target`はフォークからのPRでもベースリポジトリのコンテキストで実行されるため、セキュリティリスクがあります。信頼できるコードのみに使用してください。

---

## 🛡️ セキュリティとベストプラクティス

### トークンの取り扱い

- **推奨**: `${{ secrets.GITHUB_TOKEN }}`を使用（自動生成、スコープ限定）
- **非推奨**: Personal Access Tokenの使用（不要な権限を持つ可能性）
- **自動マスキング**: トークンは`core.setSecret()`で自動的にログからマスクされます

### 権限の最小化

```yaml
permissions:
  pull-requests: write  # ラベル管理に必要
  issues: write         # コメント投稿に必要
  contents: read        # ファイル読み取りに必要
  # 他の権限は不要
```

### エラーハンドリング

- **非致命的エラー**: Summary書き込み失敗、コメント投稿失敗（警告ログのみ）
- **致命的エラー**: 設定エラー、トークン未設定、PR以外での実行
- **fail_on_violation**: ユーザー制御の失敗条件（違反検出時）

### パフォーマンス

- **大規模PR対応**: 100+ファイルのPRでもパフォーマンス劣化なし
- **メモリ効率**: ストリーミングI/Oでメモリ使用量を最小化
- **API効率**: ページネーション、バッチ処理、キャッシュ活用

---

## 📚 関連ドキュメント

- [README.md](../README.md) - 基本的な使用方法
- [action.yml](../action.yml) - アクション定義
- [CHANGELOG.md](../CHANGELOG.md) - 変更履歴
- [pattern-matcher.ts](../src/pattern-matcher.ts) - デフォルト除外パターン一覧
