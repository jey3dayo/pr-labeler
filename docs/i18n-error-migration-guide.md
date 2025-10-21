# エラーファクトリーi18n移行ガイド

## 概要

このガイドは、既存のエラーハンドリングコードを多言語対応のエラーファクトリーに移行するための実践的な手順を提供します。

## 目次

- [移行の基本フロー](#移行の基本フロー)
- [パターン別移行例](#パターン別移行例)
- [実践的なレシピ](#実践的なレシピ)
- [トラブルシューティング](#トラブルシューティング)
- [チェックリスト](#チェックリスト)

---

## 移行の基本フロー

### ステップ1: 現状調査

既存のエラーハンドリングコードを特定します。

```bash
# カスタムメッセージを使用しているエラーを検索
grep -r "createConfigurationError.*'.*'" src/
grep -r "createGitHubAPIError.*'.*'" src/
grep -r "createFileSystemError.*'.*'" src/
```

### ステップ2: 翻訳リソースの確認

対象のエラーに対応する翻訳キーが存在するか確認します。

```bash
# errors.json の確認
cat src/locales/en/errors.json | jq .
cat src/locales/ja/errors.json | jq .
```

### ステップ3: コード移行

カスタムメッセージを削除し、翻訳キーに依存するコードに変更します。

### ステップ4: テスト実行

移行後のコードが正しく動作することを確認します。

```bash
pnpm test __tests__/error-factories-i18n.test.ts
```

---

## パターン別移行例

### パターン1: シンプルなエラーメッセージ

#### 移行前

```typescript
// ハードコードされた英語メッセージ
throw createConfigurationError('language', code, 'Invalid language code');
```

#### 移行後

```typescript
// 翻訳キーを使用
throw createConfigurationError('language', code);
```

**確認**:

```typescript
// 英語環境
// EN: "Invalid configuration field: language"

// 日本語環境
// JA: "設定フィールドが無効です: language"
```

---

### パターン2: 詳細情報を含むエラー

詳細な技術情報を含む場合、カスタムメッセージを継続使用します。

#### 移行前

```typescript
throw createConfigurationError(
  'file_size_limit',
  '10KB 20MB',
  'Multiple units detected. Use single value like "10KB" or "20MB"'
);
```

#### 移行後

```typescript
// カスタムメッセージを継続使用（翻訳リソースに収まらない詳細情報）
throw createConfigurationError(
  'file_size_limit',
  '10KB 20MB',
  'Multiple units detected. Use single value like "10KB" or "20MB"'
);

// または、翻訳リソースに新しいキーを追加
// src/locales/en/errors.json
// {
//   "configuration": {
//     "multipleUnits": "Multiple units detected. Use single value like \"10KB\" or \"20MB\""
//   }
// }

// 移行後（翻訳キー使用）
throw createConfigurationError('file_size_limit', '10KB 20MB');
// ※ただし、この場合は詳細なガイダンスが失われるため、カスタムメッセージ継続を推奨
```

---

### パターン3: ファイルシステムエラー

#### 移行前

```typescript
throw createFileSystemError(path, undefined, 'Failed to read configuration file');
```

#### 移行後

```typescript
// 操作種別を明示
throw createFileSystemError(path, 'read');
// EN: "Failed to read file: /path/to/config.yml"
// JA: "ファイルの読み込みに失敗しました: /path/to/config.yml"
```

**操作種別の選択**:

- `'read'` - ファイル読み込みエラー
- `'write'` - ファイル書き込みエラー
- `'notFound'` - ファイル未検出
- `'permission'` - 権限エラー

---

### パターン4: GitHub APIエラー

#### 移行前

```typescript
throw createGitHubAPIError('API request failed', 404);
```

#### 移行後

```typescript
// メッセージはAPIレスポンスから取得されるため、そのまま渡す
throw createGitHubAPIError(apiErrorMessage, status);
// EN: "GitHub API error: {apiErrorMessage}"
// JA: "GitHub APIエラー: {apiErrorMessage}"
```

**注意**: GitHub APIから返されるエラーメッセージは英語のため、翻訳キーで包含します。

---

### パターン5: パースエラー

#### 移行前

```typescript
throw createParseError(input, 'Invalid size format');
```

#### 移行後

```typescript
// デフォルトの翻訳キーを使用
throw createParseError(input);
// EN: "Invalid format: {input}"
// JA: "無効な形式: {input}"

// または、特定のエラー用にカスタムメッセージ
throw createParseError(input, 'Invalid JSON for size thresholds');
```

---

## 実践的なレシピ

### レシピ1: 設定バリデーションエラーの移行

**シナリオ**: ユーザー入力の設定値が不正な場合

```typescript
// Before
function validateFileSize(input: string): Result<number, ConfigurationError> {
  if (!isValidFormat(input)) {
    return err(
      createConfigurationError('file_size_limit', input, 'Invalid file size format')
    );
  }
  // ...
}

// After
function validateFileSize(input: string): Result<number, ConfigurationError> {
  if (!isValidFormat(input)) {
    return err(createConfigurationError('file_size_limit', input));
  }
  // ...
}
```

**テスト**:

```typescript
describe('validateFileSize - i18n', () => {
  it('should return English error message', () => {
    initializeI18n({ language: 'en' } as Config);
    const result = validateFileSize('invalid');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain('Invalid configuration field');
      expect(result.error.message).toContain('file_size_limit');
    }
  });

  it('should return Japanese error message', () => {
    initializeI18n({ language: 'ja' } as Config);
    const result = validateFileSize('invalid');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toContain('設定フィールドが無効です');
      expect(result.error.message).toContain('file_size_limit');
    }
  });
});
```

---

### レシピ2: ファイル読み込みエラーの移行

**シナリオ**: 設定ファイルの読み込み失敗

```typescript
// Before
async function loadConfig(path: string): Promise<Result<Config, FileSystemError>> {
  try {
    const content = await fs.readFile(path, 'utf-8');
    return ok(parseConfig(content));
  } catch (error) {
    return err(createFileSystemError(path, undefined, 'Failed to read configuration file'));
  }
}

// After
async function loadConfig(path: string): Promise<Result<Config, FileSystemError>> {
  try {
    const content = await fs.readFile(path, 'utf-8');
    return ok(parseConfig(content));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return err(createFileSystemError(path, 'notFound'));
    }
    if (error.code === 'EACCES') {
      return err(createFileSystemError(path, 'permission'));
    }
    return err(createFileSystemError(path, 'read'));
  }
}
```

**改善点**:

1. エラー種別を明示（`'read'`, `'notFound'`, `'permission'`）
2. 適切な翻訳メッセージが自動選択される
3. カスタムメッセージ不要

---

### レシピ3: GitHub API呼び出しエラーの移行

**シナリオ**: GitHub APIからのエラーレスポンス

```typescript
// Before
async function fetchPullRequest(
  owner: string,
  repo: string,
  prNumber: number
): Promise<Result<PullRequest, GitHubAPIError>> {
  try {
    const response = await octokit.pulls.get({ owner, repo, pull_number: prNumber });
    return ok(response.data);
  } catch (error) {
    return err(
      createGitHubAPIError(
        'Failed to fetch pull request',
        error.status
      )
    );
  }
}

// After
async function fetchPullRequest(
  owner: string,
  repo: string,
  prNumber: number
): Promise<Result<PullRequest, GitHubAPIError>> {
  try {
    const response = await octokit.pulls.get({ owner, repo, pull_number: prNumber });
    return ok(response.data);
  } catch (error) {
    // APIから返されたエラーメッセージをそのまま渡す
    const message = error.response?.data?.message || error.message;
    return err(createGitHubAPIError(message, error.status));
    // EN: "GitHub API error: {message}"
    // JA: "GitHub APIエラー: {message}"
  }
}
```

**改善点**:

1. APIのエラーメッセージを保持
2. 翻訳キーで包含（"GitHub API error: " / "GitHub APIエラー: "）
3. 技術詳細（ステータスコード）を保持

---

### レシピ4: 複数エラーの集約

**シナリオ**: 複数の設定エラーを収集して報告

```typescript
// Before
function validateConfig(input: RawConfig): Result<Config, ConfigurationError[]> {
  const errors: ConfigurationError[] = [];

  if (!isValidLanguage(input.language)) {
    errors.push(
      createConfigurationError('language', input.language, 'Invalid language code')
    );
  }

  if (!isValidFileSize(input.file_size_limit)) {
    errors.push(
      createConfigurationError('file_size_limit', input.file_size_limit, 'Invalid file size')
    );
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(input as Config);
}

// After
function validateConfig(input: RawConfig): Result<Config, ConfigurationError[]> {
  const errors: ConfigurationError[] = [];

  if (!isValidLanguage(input.language)) {
    errors.push(createConfigurationError('language', input.language));
    // EN: "Invalid configuration field: language"
    // JA: "設定フィールドが無効です: language"
  }

  if (!isValidFileSize(input.file_size_limit)) {
    errors.push(createConfigurationError('file_size_limit', input.file_size_limit));
    // EN: "Invalid configuration field: file_size_limit"
    // JA: "設定フィールドが無効です: file_size_limit"
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(input as Config);
}
```

**エラー表示例**:

```typescript
const result = validateConfig(invalidInput);
if (result.isErr()) {
  result.error.forEach(error => {
    console.error(`[${error.type}] ${error.message}`);
  });
}

// 英語環境:
// [ConfigurationError] Invalid configuration field: language
// [ConfigurationError] Invalid configuration field: file_size_limit

// 日本語環境:
// [ConfigurationError] 設定フィールドが無効です: language
// [ConfigurationError] 設定フィールドが無効です: file_size_limit
```

---

### レシピ5: カスタムメッセージが必要なケース

**シナリオ**: 詳細なガイダンスを提供する必要がある

```typescript
// カスタムメッセージを継続使用（推奨）
function parseThresholds(input: string): Result<Thresholds, ParseError> {
  try {
    const parsed = JSON.parse(input);

    if (!hasRequiredKeys(parsed)) {
      return err(
        createParseError(
          input,
          'Missing required size thresholds (S, M, L). Each size must have "additions" and "files" fields.'
        )
      );
    }

    if (!isMonotonic(parsed)) {
      return err(
        createParseError(
          input,
          'Size thresholds must be monotonic (S ≤ M ≤ L for both additions and files)'
        )
      );
    }

    return ok(parsed);
  } catch (error) {
    // 一般的なJSONパースエラーは翻訳キーを使用
    return err(createParseError(input));
    // EN: "Invalid format: {input}"
    // JA: "無効な形式: {input}"
  }
}
```

**判断基準**:

- **翻訳キー使用**: 一般的なエラー（"Invalid format", "File not found"など）
- **カスタムメッセージ使用**: 詳細なガイダンス、複雑なバリデーションルール

---

## トラブルシューティング

### 問題1: 翻訳されたメッセージが表示されない

**原因**: i18nが初期化されていない

**解決策**:

```typescript
// エントリーポイント（src/index.ts）で初期化を確認
import { initializeI18n } from './i18n.js';
import { mapInputs } from './input-mapper.js';

const config = mapInputs();
initializeI18n(config);  // 必須
```

---

### 問題2: 型エラー "Property 'xxx' does not exist"

**原因**: 翻訳リソースに新しいキーを追加したが、型定義が再生成されていない

**解決策**:

```bash
# 型定義の再生成
pnpm build

# または
pnpm run generate:i18n-types
```

---

### 問題3: テストで言語切り替えができない

**原因**: テスト間でi18nの状態が共有されている

**解決策**:

```typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { resetI18n, initializeI18n } from '../src/i18n.js';

describe('My Test', () => {
  beforeEach(() => {
    resetI18n();  // 各テスト前にリセット
  });

  it('should use English messages', () => {
    initializeI18n({ language: 'en' } as Config);
    // ...
  });

  it('should use Japanese messages', () => {
    initializeI18n({ language: 'ja' } as Config);
    // ...
  });
});
```

---

### 問題4: カスタムメッセージが翻訳される

**原因**: `customMessage` パラメータを渡していない

**解決策**:

```typescript
// 誤り（翻訳キーが使用される）
const error = createConfigurationError('field', value);
error.message = 'My custom message';  // 効果なし

// 正しい（カスタムメッセージを使用）
const error = createConfigurationError('field', value, 'My custom message');
```

---

### 問題5: 技術詳細が翻訳されてしまう

**原因**: 技術詳細をカスタムメッセージに含めている

**解決策**:

```typescript
// 誤り（パスが翻訳される可能性）
const error = createFileSystemError(
  path,
  undefined,
  `ファイルが見つかりません: ${path}`  // パスを含むカスタムメッセージ
);

// 正しい（翻訳キーを使用、パスは変数補間）
const error = createFileSystemError(path, 'notFound');
// EN: "File not found: /path/to/file"
// JA: "ファイルが見つかりません: /path/to/file"
// ※ パス "/path/to/file" は変更されない
```

---

## チェックリスト

### 移行前チェックリスト

- [ ] 対象のエラーファクトリー関数を特定
- [ ] 翻訳リソースに対応するキーが存在するか確認
- [ ] カスタムメッセージが必要かどうか判断
- [ ] 技術詳細（パス、コード等）の扱いを確認

### 移行後チェックリスト

- [ ] カスタムメッセージを削除または適切に使用
- [ ] 翻訳キーが正しく参照されている
- [ ] 技術詳細が適切に保持されている
- [ ] 英語と日本語の両方でテスト実施
- [ ] 型エラーがないことを確認（`pnpm type-check`）
- [ ] リントエラーがないことを確認（`pnpm lint`）
- [ ] 全テストが成功することを確認（`pnpm test`）

### デプロイ前チェックリスト

- [ ] すべての移行が完了
- [ ] ビルドが成功（`pnpm build`）
- [ ] 統合テストが成功
- [ ] ドキュメントが更新されている
- [ ] レビューが完了

---

## まとめ

この移行ガイドに従うことで、既存のエラーハンドリングコードを安全かつ効率的に多言語対応に移行できます。

**重要なポイント**:

1. 一般的なエラーは翻訳キーを使用
2. 詳細なガイダンスが必要な場合はカスタムメッセージを継続使用
3. 技術詳細（パス、コード）は必ず保持
4. テストで両言語の出力を確認
5. 型定義は `pnpm build` で自動再生成

**さらなるリソース**:

- [API.md - エラーファクトリーi18n統合](./API.md#-エラーファクトリーの多言語化-i18n-integration)
- [src/errors/factories.ts](../src/errors/factories.ts) - 実装例
- [**tests**/error-factories-i18n.test.ts](../__tests__/error-factories-i18n.test.ts) - テスト例
