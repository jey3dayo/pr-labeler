# Release Command - 自動リリース管理システム

GitHub Actionプロジェクトの新バージョンリリースを自動化するコマンドです。

## 🎯 機能

- **バージョン自動計算**: Semantic Versioningに従った自動インクリメント
- **リリース前チェック**: lint/test/build の自動実行
- **CHANGELOG自動更新**: 変更内容の自動抽出と整形
- **タグ自動管理**: vX.Y.Z と vメジャーバージョンタグの自動作成・更新
- **GitHub Release作成**: リリースノートの自動生成
- **ロールバック対応**: エラー時の自動ロールバック
- ⚡ 新機能 ⚡
  - **Breaking Changes自動検出**: `BREAKING CHANGE:` フッターや `feat!:` 記法から自動検出
  - **PR番号自動抽出**: コミットメッセージから `(#123)` 形式のPR番号を自動抽出
  - **Contributors自動生成**: git shortlogからコントリビューター一覧を自動生成
  - **テストカウント改善**: より堅牢なテスト結果抽出とエラーハンドリング

## 使用方法

```bash
# パッチリリース (v1.0.1 → v1.0.2)
/release patch

# マイナーリリース (v1.0.1 → v1.1.0)
/release minor

# メジャーリリース (v1.0.1 → v2.0.0)
/release major

# ドライラン（実行せず確認のみ）
/release patch --dry-run

# 自動コミット・プッシュなし（手動制御）
/release minor --no-push
```

## 📋 実行フロー

### Phase 1: 現状確認とバージョン計算

1. 現在のバージョンを取得 (`package.json`, `git tag`)
2. 新しいバージョンを計算
3. ワーキングディレクトリの状態確認（未コミット変更のチェック）

### 出力例:

```
📊 現在のバージョン: v1.0.1
🎯 新しいバージョン: v1.0.2
📝 変更タイプ: PATCH
```

### Phase 2: リリース前チェック

自動的に以下を実行：

```bash
pnpm lint        # コードスタイルチェック
pnpm type-check  # TypeScript型チェック
pnpm test        # テスト実行
pnpm build       # ビルド実行
```

### いずれか1つでも失敗した場合、リリースを中止します。

### Phase 3: ドキュメント更新

1. package.json の更新
   - `version` フィールドを新バージョンに更新

2. CHANGELOG.md の更新
   - 新バージョンのエントリを先頭に追加
   - リリース日を自動設定
   - 最近のコミットから変更内容を自動抽出

### CHANGELOG.md 生成ロジック:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- feat: で始まるコミット

### Changed
- refactor: で始まるコミット

### Fixed
- fix: で始まるコミット

### Other
- その他のコミット

[X.Y.Z]: https://github.com/USER/REPO/releases/tag/vX.Y.Z
```

### Phase 4: Git操作

1. 変更をコミット

   ```bash
   git add package.json CHANGELOG.md dist/
   git commit -m "chore: release vX.Y.Z"
   ```

2. タグ作成

   ```bash
   # 具体的なバージョンタグ
   git tag -a vX.Y.Z -m "Release vX.Y.Z"

   # メジャーバージョンタグの更新（重要！）
   git tag -f vX vX.Y.Z^{}
   ```

3. プッシュ

   ```bash
   git push origin main
   git push origin vX.Y.Z
   git push origin vX --force
   ```

### Phase 5: GitHub Release作成

GitHub CLI (`gh`) を使用してリリースを作成。リリースノートは以下の**標準フォーマット**に厳密に従うこと：

```markdown
## ⚠️ Breaking Changes (breaking changeがある場合のみ)

- 変更内容 (#PR)
  - **Migration Guide**: 移行手順

## 🚀 What's New

### ✨ Added
- **機能名**: 説明 (#PR)

### 🔄 Changed
- 説明 (#PR)

### 🐛 Fixed
- 説明 (#PR)

### 🔧 Refactoring
- 説明 (#PR)

## 📊 Quality Metrics

- ✅ Tests: N tests passing
- ✅ Lint: No issues
- ✅ TypeCheck: No errors
- ✅ Build: Successful

## 👥 Contributors

- Full Name (@github-username)

## 🔗 Full Changelog

**Full Changelog**: https://github.com/OWNER/REPO/compare/vPREV...vCURRENT
```

### フォーマットルール:

- `## 🚀 What's New` は常に使用（変更種別に関わらず）
- サブセクションは変更がある種別のみ表示（空セクションは省略）
  - `feat:` → `### ✨ Added`
  - `chore:`, `docs:`, `style:` → `### 🔄 Changed`
  - `fix:` → `### 🐛 Fixed`
  - `refactor:` → `### 🔧 Refactoring`
- Quality Metrics のフォーマット: `- ✅ Tests: N tests passing`（`pnpm vitest run` の結果から取得）
- Contributors: `git shortlog -s -n vPREV..HEAD` から取得し `Full Name (@github-username)` 形式
- Full Changelog: 必ず `**Full Changelog**: URL` の形式（太字プレフィックス）
- Breaking Changes セクションは該当がなければ省略

### Phase 6: メジャーバージョンRelease更新

**重要**: メジャーバージョンタグ（v1, v2など）のGitHub Releaseも更新する必要があります。

```bash
gh release edit vX \
  --title "vX (Latest vX.x)" \
  --notes "最新のvX.Y.Zを指すフローティングタグの説明"
```

### vX Release の内容:

- 現在のバージョン番号（vX.Y.Z）
- 最新リリースの変更内容概要
- 使用方法（`@vX` タグの推奨）
- 最近のバージョン履歴

### 例: v1 Release 更新内容

```markdown
# Latest v1.x Release

This is a floating tag that always points to the latest v1.x release.

## Current Version: v1.11.1

For detailed release notes, see: https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v1.11.1

## Usage

\```yaml
# Recommended: Use floating tag for automatic updates
- uses: jey3dayo/pr-insights-labeler@v1

# Or use specific version for stability
- uses: jey3dayo/pr-insights-labeler@v1.11.1
\```

## What's New in v1.11.1

### 🔧 Refactoring
- reduce cyclomatic complexity: extract helper functions for Critical (30+) and High (28-29) complexity functions (#132)

## Recent Versions

- [v1.11.1](https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v1.11.1) - 2026-02-19
- [v1.11.0](https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v1.11.0) - 2026-02-19
- [v1.10.2](https://github.com/jey3dayo/pr-insights-labeler/releases/tag/v1.10.2) - 2026-01-25

**Full Changelog**: https://github.com/jey3dayo/pr-insights-labeler/compare/vPREV...vCURRENT
```

### なぜ必要か:

- ユーザーが `@v1` タグを使用している場合、最新のv1.xが自動適用される
- v1 Releaseページが古いバージョンを指していると混乱を招く
- メジャーバージョンの最新情報を一箇所で確認できる利便性

## 🛡️ エラーハンドリング

### リリース前チェック失敗時

```
❌ リリース前チェックに失敗しました

失敗項目:
- pnpm test: 3 tests failed

対処方法:
1. テストを修正してください
2. すべてのチェックが成功したら再実行してください
```

### 実行内容:

- 何も変更せずに終了
- ワーキングディレクトリは元の状態を維持

### タグ作成失敗時

```
❌ タグ vX.Y.Z が既に存在します

対処方法:
1. 既存タグを削除する場合:
   git tag -d vX.Y.Z
   git push origin :refs/tags/vX.Y.Z

2. 別のバージョンでリリースする場合:
   /release patch --next
```

### 実行内容:

- コミットはロールバック
- package.json, CHANGELOG.md は元に戻す

### プッシュ失敗時

```
⚠️ プッシュに失敗しました

ローカル状態:
- ✅ コミット作成済み
- ✅ タグ作成済み
- ❌ リモートプッシュ失敗

対処方法:
1. ネットワーク接続を確認
2. 手動でプッシュ:
   git push origin main
   git push origin vX.Y.Z vX --force

または、ロールバック:
   git reset --hard HEAD~1
   git tag -d vX.Y.Z vX
```

## 🔧 オプション

### `--dry-run`

実際には変更せず、実行内容のみを表示：

```bash
/release patch --dry-run
```

### 出力例:

```
🔍 ドライランモード（実際には変更しません）

実行予定の操作:
1. バージョン更新: v1.0.1 → v1.0.2
2. package.json 更新
3. CHANGELOG.md 更新
4. コミット作成: "chore: release v1.0.2"
5. タグ作成: v1.0.2, v1
6. プッシュ: main, v1.0.2, v1
7. GitHub Release作成
```

### `--no-push`

コミット・タグ作成まで実行し、プッシュは手動で行う：

```bash
/release minor --no-push
```

### 実行内容:

- ✅ リリース前チェック
- ✅ ドキュメント更新
- ✅ コミット作成
- ✅ タグ作成
- ⏸️ プッシュはスキップ

### 手動プッシュ:

```bash
git push origin main
git push origin vX.Y.Z vX --force
gh release create vX.Y.Z
```

### `--skip-checks`

リリース前チェックをスキップ（非推奨）：

```bash
/release patch --skip-checks
```

### 警告:

```
⚠️ リリース前チェックをスキップします
品質保証が行われていないため、本番環境での使用は推奨されません。
```

### `--force`

既存タグを強制的に上書き：

```bash
/release patch --force
```

### 動作:

- 既存の vX.Y.Z タグを削除
- 新しいタグを作成
- リモートに強制プッシュ

## 📚 実装詳細

### バージョン計算ロジック

```python
def calculate_next_version(current: str, bump_type: str) -> str:
    """
    現在のバージョンから次のバージョンを計算

    Args:
        current: 現在のバージョン (e.g., "1.0.1")
        bump_type: バージョンタイプ ("patch" | "minor" | "major")

    Returns:
        次のバージョン (e.g., "1.0.2")
    """
    major, minor, patch = map(int, current.lstrip('v').split('.'))

    if bump_type == "major":
        return f"{major + 1}.0.0"
    elif bump_type == "minor":
        return f"{major}.{minor + 1}.0"
    else:  # patch
        return f"{major}.{minor}.{patch + 1}"
```

### CHANGELOG生成ロジック

```python
def generate_changelog_entry(from_version: str, to_version: str) -> str:
    """
    前回リリースからのコミットを解析してCHANGELOGエントリを生成
    """
    # 前回タグから現在までのコミット取得
    commits = git.log(f"v{from_version}..HEAD", format="%s")

    # コミットメッセージを分類
    added = [c for c in commits if c.startswith("feat:")]
    changed = [c for c in commits if c.startswith("refactor:")]
    fixed = [c for c in commits if c.startswith("fix:")]
    other = [c for c in commits if not any(c.startswith(p) for p in ["feat:", "fix:", "refactor:"])]

    # Markdownエントリ生成
    entry = f"## [{to_version}] - {today()}\n\n"

    if added:
        entry += "### Added\n"
        for commit in added:
            entry += f"- {commit.removeprefix('feat:').strip()}\n"
        entry += "\n"

    if changed:
        entry += "### Changed\n"
        for commit in changed:
            entry += f"- {commit.removeprefix('refactor:').strip()}\n"
        entry += "\n"

    if fixed:
        entry += "### Fixed\n"
        for commit in fixed:
            entry += f"- {commit.removeprefix('fix:').strip()}\n"
        entry += "\n"

    return entry
```

### メジャーバージョンタグ更新

```python
def update_major_version_tag(version: str):
    """
    vX.Y.Z から vX タグを作成・更新

    例: v1.2.3 → v1 タグを v1.2.3 のコミットに向ける
    """
    major = version.split('.')[0]  # "v1"

    # 既存のvXタグを削除
    if tag_exists(major):
        git.tag("-d", major)
        git.push("origin", f":refs/tags/{major}")

    # 新しいvXタグを作成（lightweight tag）
    git.tag(major, f"{version}^{{}}")

    # 強制プッシュ
    git.push("origin", major, "--force")
```

## 🎯 ベストプラクティス

### 1. 定期的なリリース

```bash
# パッチリリース（バグフィックス）: 即座に
/release patch

# マイナーリリース（新機能）: 1-2週間ごと
/release minor

# メジャーリリース（破壊的変更）: 慎重に、事前告知
/release major
```

### 2. リリース前の確認事項

```bash
# 1. すべてのPRがマージ済み
gh pr list --state open

# 2. mainブランチが最新
git pull origin main

# 3. ローカルに未コミット変更なし
git status

# 4. すべてのチェックが成功
pnpm test && pnpm lint && pnpm type-check && pnpm build
```

### 3. リリース後の確認

```bash
# 1. GitHub Releaseが作成されているか
gh release view vX.Y.Z

# 2. メジャーバージョンReleaseが更新されているか（重要！）
gh release view vX

# 3. タグが正しいか
git tag -l "v*" | sort -V | tail -5

# 4. CIが成功しているか
gh run list --branch main --limit 3
```

## 🔍 トラブルシューティング

### Q: `pnpm test` が失敗してリリースできない

**A:** テストを修正してから再実行してください。

```bash
# テスト実行
pnpm test

# 失敗したテストのみ再実行
pnpm test -- path/to/failing-test.ts

# 修正後、再度リリース
/release patch
```

### Q: タグが既に存在する

**A:** 既存タグを削除するか、`--force` オプションを使用：

```bash
# オプション1: 既存タグを削除
git tag -d v1.0.2
git push origin :refs/tags/v1.0.2

# オプション2: 強制上書き
/release patch --force
```

### Q: GitHub Releaseの作成に失敗した

**A:** GitHub CLIの認証を確認：

```bash
# 認証状態確認
gh auth status

# 再認証
gh auth login

# 手動でリリース作成
gh release create v1.0.2 --title "v1.0.2" --notes "..."
```

### Q: ドライランで確認したい

**A:** `--dry-run` オプションを使用：

```bash
/release patch --dry-run
```

## 📝 関連ドキュメント

- [docs/ja/release-process.md](../docs/ja/release-process.md) - 手動リリース手順
- [CHANGELOG.md](../CHANGELOG.md) - リリース履歴
- [Semantic Versioning](https://semver.org/) - バージョニング規約

---

## 実装コマンド

あなたは `/release` コマンドを実行しています。

### 手順:

1. 現状確認
   - 現在のバージョンを確認
   - ワーキングディレクトリの状態確認
   - ブランチ確認（mainブランチであることを確認）

2. バージョンタイプ確認
   - 引数から bump_type を取得 (patch/minor/major)
   - 新しいバージョンを計算

3. リリース前チェック（--skip-checks でスキップ可能）

   ```bash
   pnpm lint && pnpm type-check && pnpm test && pnpm build
   ```

4. ドキュメント更新
   - package.json の version フィールド更新
   - CHANGELOG.md に新エントリ追加（前回タグからのコミット履歴を分析）

5. コミット作成

   ```bash
   git add package.json CHANGELOG.md dist/
   git commit -m "chore: release vX.Y.Z"
   ```

6. タグ作成

   ```bash
   # 具体的なバージョンタグ
   git tag -a vX.Y.Z -m "Release vX.Y.Z"

   # メジャーバージョンタグを更新
   git tag -f vX vX.Y.Z^{}
   ```

7. プッシュ（--no-push でスキップ可能）

   ```bash
   git push origin main
   git push origin vX.Y.Z
   git push origin vX --force
   ```

8. GitHub Release作成

   `git log vPREV..HEAD --pretty=format:"%s"` でコミットを分類し、以下の**標準フォーマット**でリリースノートを生成すること：

   ```
   ## 🚀 What's New

   ### ✨ Added       ← feat: コミットがある場合のみ
   - **機能名**: 説明 (#PR)

   ### 🔄 Changed    ← chore:/docs:/style: コミットがある場合のみ
   - 説明 (#PR)

   ### 🐛 Fixed      ← fix: コミットがある場合のみ
   - 説明 (#PR)

   ### 🔧 Refactoring ← refactor: コミットがある場合のみ
   - 説明 (#PR)

   ## 📊 Quality Metrics

   - ✅ Tests: N tests passing    ← pnpm vitest run の結果から取得
   - ✅ Lint: No issues
   - ✅ TypeCheck: No errors
   - ✅ Build: Successful

   ## 👥 Contributors

   - Full Name (@github-username)  ← git shortlog -s -n vPREV..HEAD から取得

   ## 🔗 Full Changelog

   **Full Changelog**: https://github.com/jey3dayo/pr-insights-labeler/compare/vPREV...vCURRENT
   ```

   テスト数の取得:
   ```bash
   pnpm vitest run 2>&1 | grep "Tests " | grep -oP '\d+ passed'
   ```

   Contributorsの取得:
   ```bash
   git shortlog -s -n vPREV..HEAD | awk '{$1=""; name=substr($0,2); print "- " name " (@jey3dayo)"}'
   ```

9. メジャーバージョンRelease更新（重要！）

   ```bash
   # v1, v2などのメジャーバージョンタグのGitHub Releaseを更新
   gh release edit vX \
     --title "vX (Latest vX.x)" \
     --notes "..."
   ```

   ### 生成する内容（標準フォーマット）:
   ```
   # Latest v1.x Release

   This is a floating tag that always points to the latest v1.x release.

   ## Current Version: vX.Y.Z

   For detailed release notes, see: https://github.com/jey3dayo/pr-insights-labeler/releases/tag/vX.Y.Z

   ## Usage

   ```yaml
   # Recommended: Use floating tag for automatic updates
   - uses: jey3dayo/pr-insights-labeler@v1

   # Or use specific version for stability
   - uses: jey3dayo/pr-insights-labeler@vX.Y.Z
   ```

   ## What's New in vX.Y.Z

   （最新バージョンの変更内容を簡潔に）

   ## Recent Versions

   - [vX.Y.Z](URL) - YYYY-MM-DD
   - [vX.Y.Z-1](URL) - YYYY-MM-DD
   - [vX.Y.Z-2](URL) - YYYY-MM-DD

   **Full Changelog**: https://github.com/jey3dayo/pr-insights-labeler/compare/vPREV...vCURRENT
   ```

10. 完了報告

   ```
   ✨ リリース v1.0.2 が完了しました！

   📦 作成されたもの:
   - ✅ コミット: chore: release v1.0.2
   - ✅ タグ: v1.0.2, v1
   - ✅ GitHub Release: https://github.com/USER/REPO/releases/tag/v1.0.2
   - ✅ v1 Release更新: https://github.com/USER/REPO/releases/tag/v1

   次のステップ:
   1. GitHub Actionsでのビルド確認
   2. ユーザーへのアナウンス
   ```

### エラーハンドリング:

各ステップで失敗した場合、適切にロールバックし、ユーザーに対処方法を提示してください。
