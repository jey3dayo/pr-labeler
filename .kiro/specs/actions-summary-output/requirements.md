# Requirements Document

## Project Description (Input)

"GitHub Actions Summary出力機能: PR分析結果をActions Summaryに表示"

## Introduction

GitHub ActionsのワークフローサマリーページにPR分析結果を表示する機能を追加します。現在のアクションはラベル付けとコメント投稿のみを行っていますが、Actions実行結果画面（Summary）にメトリクス情報を表示することで、開発者はPRページに遷移せずともワークフロー実行結果から直接PRの状態を把握できるようになります。これにより、CI/CDパイプラインの可視性が向上し、開発効率が改善されます。

## Requirements

### Requirement 1: Actions Summary への基本メトリクス表示

**Objective:** As a 開発者, I want ワークフローサマリーページでPRの基本メトリクスを確認したい, so that PRページに遷移せずとも変更規模を把握できる

#### Acceptance Criteria

1. WHEN PR Metrics Actionが実行完了する THEN PR Metrics Action SHALL Actions SummaryにPRの総追加行数を表示する
2. WHEN PR Metrics Actionが実行完了する THEN PR Metrics Action SHALL Actions SummaryにPRの総ファイル数を表示する
3. WHEN PR Metrics Actionが実行完了する THEN PR Metrics Action SHALL Actions SummaryにPRのサイズラベル（S/M/L/XL/XXL）を表示する
4. WHEN PR Metrics Actionが実行完了する THEN PR Metrics Action SHALL Actions Summaryに実行時刻を表示する
5. IF PRがDraftモードである THEN PR Metrics Action SHALL Actions Summaryに「Draft PRをスキップしました」というメッセージを表示する

### Requirement 2: 違反情報の詳細表示

**Objective:** As a 開発者, I want ワークフローサマリーページで制限違反の詳細を確認したい, so that どのファイルが問題なのかを即座に把握できる

#### Acceptance Criteria

1. WHEN ファイルサイズ制限違反が検出される THEN PR Metrics Action SHALL Actions Summaryに違反ファイルのリストを表形式で表示する
2. WHEN ファイル行数制限違反が検出される THEN PR Metrics Action SHALL Actions Summaryに違反ファイルのリストを表形式で表示する
3. WHEN PR追加行数制限違反が発生する THEN PR Metrics Action SHALL Actions Summaryに超過した行数と制限値を表示する
4. WHEN ファイル数制限違反が発生する THEN PR Metrics Action SHALL Actions Summaryに総ファイル数と制限値を表示する
5. IF 違反が存在しない THEN PR Metrics Action SHALL Actions Summaryに「すべてのチェックに合格しました」というメッセージを表示する

### Requirement 3: ファイル詳細情報の表示

**Objective:** As a 開発者, I want 変更されたファイルの詳細情報をワークフローサマリーで確認したい, so that 各ファイルの影響範囲を素早く理解できる

#### Acceptance Criteria

1. WHEN PR Metrics Actionが実行完了する THEN PR Metrics Action SHALL Actions Summaryに変更ファイル一覧を表形式で表示する
2. WHERE 変更ファイル一覧 THE PR Metrics Action SHALL 各ファイルのパスを表示する
3. WHERE 変更ファイル一覧 THE PR Metrics Action SHALL 各ファイルの追加行数を表示する
4. WHERE 変更ファイル一覧 THE PR Metrics Action SHALL 各ファイルの削除行数を表示する
5. WHERE 変更ファイル一覧 THE PR Metrics Action SHALL 各ファイルのサイズを表示する
6. IF ファイルが除外パターンに一致する THEN PR Metrics Action SHALL そのファイルを一覧から除外する

### Requirement 4: マークダウン形式での整形表示

**Objective:** As a 開発者, I want Actions Summaryが見やすく整形されて表示されることを期待する, so that 情報を素早く読み取れる

#### Acceptance Criteria

1. WHEN Actions Summaryを生成する THEN PR Metrics Action SHALL マークダウン見出しを使用してセクションを構造化する
2. WHEN テーブルを表示する THEN PR Metrics Action SHALL マークダウンテーブル構文を使用する
3. WHEN 数値を表示する THEN PR Metrics Action SHALL 適切な単位（行、バイト、KB、MB）を付与する
4. WHEN 違反項目を表示する THEN PR Metrics Action SHALL 警告アイコン（⚠️）を使用する
5. WHEN 成功メッセージを表示する THEN PR Metrics Action SHALL 成功アイコン（✅）を使用する
6. WHEN サイズラベルを表示する THEN PR Metrics Action SHALL ラベルをバッジ形式で表示する

### Requirement 5: GitHub Actions API統合

**Objective:** As a システム, I want @actions/coreのsummary機能を使用してSummaryを出力したい, so that GitHub Actions標準の方法でサマリーを表示できる

#### Acceptance Criteria

1. WHEN Actions Summaryを出力する THEN PR Metrics Action SHALL @actions/core の summary.addRaw() または summary.addTable() を使用する
2. WHEN Actions Summaryを出力する THEN PR Metrics Action SHALL summary.write() を呼び出してサマリーをコミットする
3. IF summary.write()がエラーを返す THEN PR Metrics Action SHALL エラーログを出力し、アクションを失敗させる
4. WHEN 複数のセクションを追加する THEN PR Metrics Action SHALL 各セクションを順次summary.addRaw()で追加する

### Requirement 6: 既存機能との互換性維持

**Objective:** As a ユーザー, I want Actions Summary出力が既存のラベル・コメント機能に影響を与えないことを期待する, so that 既存のワークフローが正常に動作し続ける

#### Acceptance Criteria

1. WHEN Actions Summary出力機能が有効化される THEN PR Metrics Action SHALL 既存のラベル付け機能を引き続き実行する
2. WHEN Actions Summary出力機能が有効化される THEN PR Metrics Action SHALL 既存のコメント投稿機能を引き続き実行する
3. WHEN Actions Summary出力機能が有効化される THEN PR Metrics Action SHALL 既存の出力変数をすべて設定する
4. IF Actions Summary出力中にエラーが発生する AND fail_on_violation=false THEN PR Metrics Action SHALL エラーログを出力するがアクションを成功として終了する
5. IF Actions Summary出力中にエラーが発生する AND fail_on_violation=true THEN PR Metrics Action SHALL アクションを失敗として終了する

### Requirement 7: 設定可能性

**Objective:** As a ユーザー, I want Actions Summary出力の有効/無効を制御したい, so that 必要に応じて機能をオン/オフできる

#### Acceptance Criteria

1. WHEN action.ymlに enable_summary 入力パラメータが定義される THEN PR Metrics Action SHALL そのパラメータを読み取る
2. IF enable_summary が true または未設定 THEN PR Metrics Action SHALL Actions Summaryを出力する
3. IF enable_summary が false THEN PR Metrics Action SHALL Actions Summaryを出力しない
4. WHEN enable_summary のデフォルト値が設定される THEN PR Metrics Action SHALL デフォルト値を true とする
