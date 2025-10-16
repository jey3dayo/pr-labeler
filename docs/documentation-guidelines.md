# 📚 ドキュメント管理ガイドライン

**最終更新**: 2025-10-15
**対象**: 開発者・コントリビューター
**タグ**: `category/documentation`, `audience/developer`

## 📋 概要

本文書では、PR Metrics Action プロジェクトのドキュメント管理体系、タグ分類システム、メタデータ形式の統一ルールを定義します。

## 🏷️ タグ体系

タグは以下の接頭辞付き形式を使用します：`category/値`, `audience/値`, `environment/値`

### カテゴリタグ (`category/`)

- `category/documentation` - ドキュメント管理関連
- `category/action` - GitHub Action定義・設定
- `category/api` - GitHub API・Octokit関連
- `category/development` - 開発ガイド・設定
- `category/testing` - テスト戦略・実装
- `category/deployment` - リリース・デプロイメント
- `category/cicd` - CI/CD・GitHub Actions
- `category/security` - セキュリティ・認証
- `category/operations` - 運用・メンテナンス
- `category/cc-sdd` - cc-sdd関連ドキュメント

### 対象者タグ (`audience/`)

- `audience/developer` - 開発者向け
- `audience/contributor` - コントリビューター向け
- `audience/user` - エンドユーザー向け
- `audience/maintainer` - メンテナー向け

### 環境タグ (`environment/`)

- `environment/development` - 開発環境
- `environment/testing` - テスト環境
- `environment/production` - 本番環境（GitHub Actions実行時）

## 📝 メタデータ形式

全ドキュメントは以下の形式でメタデータを記載します：

```markdown
# [アイコン] [タイトル]

**最終更新**: YYYY-MM-DD
**対象**: [読者層]
**タグ**: `category/値`, `audience/値`, `environment/値`
```

### 必須項目

- **最終更新**: YYYY-MM-DD形式（ISO 8601）
- **対象**: 対象読者を日本語で明記（複数可）
- **タグ**: 最低1つのカテゴリタグと1つの対象者タグを含む

### アイコンガイド

- 📚 ドキュメント・ガイドライン
- 🎯 プロジェクト概要・目的
- 🚀 クイックスタート・セットアップ
- 📝 仕様・設計
- 🛠 開発・実装
- 🧪 テスト関連
- 📦 リリース・デプロイ
- 🔧 設定・カスタマイズ
- 🐛 トラブルシューティング
- 🤝 コントリビューション
- 📊 メトリクス・分析
- 🔐 セキュリティ

## 📁 ドキュメント構成

### ディレクトリ構造

```
pr-metrics-action/
├── README.md            # プロジェクト概要（ユーザー向け）
├── CLAUDE.md           # Claude Code開発ガイド
├── docs/
│   ├── documentation-guidelines.md  # 本文書
│   ├── api-reference.md            # API リファレンス（予定）
│   ├── configuration.md            # 設定ガイド（予定）
│   ├── troubleshooting.md          # トラブルシューティング（予定）
│   └── examples/                   # 使用例（予定）
├── .claude/
│   └── commands/       # cc-sddコマンドドキュメント
└── .specify/
    ├── spec.md         # 機能仕様書
    ├── plan.md         # 実装計画書
    └── tasks.md        # タスクリスト
```

### ファイル命名規則

- **小文字とハイフン**: `kebab-case.md` 形式を使用
- **説明的な名前**: 内容が明確に分かる名前を付ける
- **言語**: 英語ファイル名、日本語コンテンツ

## 📊 現在のドキュメント一覧

| ファイル名                       | タグ                                                                      | 概要                       | ステータス  |
| -------------------------------- | ------------------------------------------------------------------------- | -------------------------- | ----------- |
| README.md                        | `category/documentation`, `audience/user`                                 | プロジェクト概要・使用方法 | 作成予定    |
| CLAUDE.md                        | `category/documentation`, `audience/developer`, `environment/development` | Claude Code協働ガイド      | ✅ 作成済   |
| docs/documentation-guidelines.md | `category/documentation`, `audience/developer`                            | ドキュメント管理体系       | ✅ 作成済   |
| docs/api-reference.md            | `category/api`, `audience/developer`                                      | GitHub API使用方法         | 📝 計画中   |
| docs/configuration.md            | `category/action`, `audience/user`                                        | Action設定ガイド           | 📝 計画中   |
| docs/troubleshooting.md          | `category/operations`, `audience/user`, `audience/developer`              | 問題解決ガイド             | 📝 計画中   |
| .specify/spec.md                 | `category/cc-sdd`, `audience/developer`                                   | 機能仕様書                 | ⏳ 随時更新 |
| .specify/plan.md                 | `category/cc-sdd`, `audience/developer`                                   | 実装計画書                 | ⏳ 随時更新 |
| .specify/tasks.md                | `category/cc-sdd`, `audience/developer`                                   | タスク管理                 | ⏳ 随時更新 |

### ステータス凡例

- ✅ 作成済 - 完成・運用中
- 📝 計画中 - 作成予定
- ⏳ 随時更新 - cc-sddワークフローで自動更新

## 🔄 更新ルール

### 1. ドキュメント更新時

- `最終更新`日付を必ず更新
- 重要な変更は更新履歴セクションに記録
- 関連ドキュメントがある場合は相互参照を確認

### 2. 新規ドキュメント作成時

- 本ガイドラインのメタデータ形式に従う
- ドキュメント一覧表に追加
- CLAUDE.mdの関連ドキュメントセクションを更新（必要な場合）

### 3. タグの新規追加

- 既存のタグで表現できない場合のみ追加
- 本文書のタグ体系セクションを更新
- 既存ドキュメントへの影響を確認

## 📏 ドキュメントサイズ管理

### 推奨サイズ

- **理想**: 300行以内
  - 素早く全体を把握可能
  - Claude Codeが効率的に処理可能

- **許容**: 500行以内
  - 詳細な技術文書として適切
  - 読みやすさを維持

- **上限**: 1000行
  - これを超える場合は分割を検討
  - セクション単位でファイル分離

### 分割基準

ドキュメントが大きくなりすぎた場合：

1. **機能別分割**: 異なる機能は別ファイルへ
2. **対象者別分割**: ユーザー向けと開発者向けを分離
3. **詳細度別分割**: 概要と詳細リファレンスを分離

## 🔍 品質チェック項目

### 作成時チェック

- [ ] メタデータ（更新日、対象、タグ）が記載されている
- [ ] 適切なアイコンが使用されている
- [ ] 目次が必要な場合は含まれている
- [ ] コード例が動作することを確認済み
- [ ] 関連ドキュメントへのリンクが正しい

### 定期レビュー

- **月次**: アクティブなドキュメントの内容確認
- **四半期**: 全ドキュメントのメタデータ更新
- **リリース時**: バージョン依存の内容を更新

## 📝 Markdown記法ガイド

### 推奨する記法

```markdown
# 見出しレベル1（ファイルに1つ）
## 見出しレベル2（主要セクション）
### 見出しレベル3（サブセクション）

**重要な情報**は太字
*強調*は斜体
`コード`はバッククォート

- 箇条書き
  - ネストは2スペース

1. 番号付きリスト
2. 自動採番を活用

> 引用や注意事項

\`\`\`typescript
// コードブロックは言語を指定
const example = "code";
\`\`\`
```

### 避けるべき記法

- HTML タグの直接使用（必要最小限に）
- 過度なネスト（3階層まで）
- 画像の多用（必要な図表のみ）
- 外部リンクの過多（公式ドキュメントのみ）

## 🤖 AI協働の考慮事項

### Claude Code最適化

- 明確な構造化でAIの理解を支援
- タグシステムでコンテキスト把握を容易に
- 一貫したフォーマットで処理効率向上

### プロンプトフレンドリー

- セクション見出しは検索しやすい名前に
- コード例は完全で実行可能な形で記載
- エラーメッセージは正確にコピー

## 🔄 更新履歴

- **2025-10-15**: 初版作成、基本的なガイドライン策定

---

**メンテナー**: jey3dayo | **ライセンス**: MIT | **リポジトリ**: [jey3dayo/pr-metrics-action](https://github.com/jey3dayo/pr-metrics-action)
