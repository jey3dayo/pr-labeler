---
paths:
  - "terraform/**"
  - "infra/**"
---

# Terraform Rules (Draft)

## 目的と範囲
- Terraform/IaC変更時のstate管理・レビュー・権限を暫定定義する。詳細ドキュメント作成が必要。

## 当面の運用
- stateバックエンドとworkspaceを環境ごとに分離し、手動での`terraform apply`はロックを確認してから実行する。
- plan/applyは必ず差分を確認し、出力をPRに貼る。並列applyを防ぐためロック解除は慎重に行う。
- Secrets/Provider資格情報はCIシークレットで管理し、平文を置かない。

## TODO
- 本リポジトリ向けのbackend設定・ディレクトリ構成・モジュール分割ポリシーの正式ドキュメントを追加する。
