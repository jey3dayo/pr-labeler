---
paths: .claude/**, CLAUDE.md, AGENTS.md, .kiro/**
---

# AI Tools & Claude Rules

## 目的と範囲

- Claude Code/cc-sddの利用手順と挙動ルールを明確化し、コンテキスト消費を最適化する。

## 基本姿勢

- 思考は英語、出力は日本語（CLAUDE.mdの方針）。spec-drivenの3フェーズ（requirements→design→tasks→implementation）を遵守する。
- `.kiro/specs/`のActive specを確認し、`/kiro:spec-status`で進捗を照合する。

## ルールファイルのスコープ

- `.claude/rules/*.md`には必ず`paths`を指定してコンテキストの初期ロードを抑制する。配列形式を使用し、braces省略のYAMLを推奨。例:  

  ```yaml
  paths:
    - "src/**/*.ts"
    - "tests/**/*.test.ts"
  ```

- パスレス運用は避け、必要に応じてglobを追加する。

## コマンド運用

- `/create-pr`, `/release` などのコマンドはdocsとCLAUDE.mdに沿って使う。ブランチ/タグ名はテンプレートに合わせる。
- 重要な自動生成ファイル（dist/など）を更新する場合はCI/リリース手順と整合を取る。

## i18nとエラーメッセージ

- docs/jaを正典としてエラー文言を同期し、英語版が未整備のときはTODOを残す。
