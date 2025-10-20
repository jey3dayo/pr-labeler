# Valibot型バリデーション移行 - 検討結果

**作成日:** 2025-10-20
**ステータス:** **導入見送り**
**関連Issue:** [#14 型ガード・バリデーションライブラリ（Valibot）の導入検討](https://github.com/jey3dayo/pr-labeler/issues/14)

## 結論

**Valibot導入を見送ることに決定。** バンドルサイズ制約（増加≤5KB）を満たせないため。

---

## 検討プロセス

### 1. 要件定義

- **目的**: 手動型ガード関数の保守性向上・型安全性強化
- **期待効果**: スキーマから型を自動推論し、型変更時の手動更新を不要化
- **制約**: バンドルサイズ増加≤5KB（GitHub Actions環境での実行を考慮）

### 2. 実装試行

以下の実装を試行：

1. ✅ Valibot 1.1.0 を依存関係に追加
2. ✅ `src/schemas/errors.ts` 作成（`ComplexityAnalysisErrorSchema` 定義）
3. ✅ `isComplexityAnalysisError` を `safeParse` ベースに置換
4. ✅ テスト作成（スキーマ単体テスト19件、型ガードテスト追加）
5. ✅ strictObject使用（未知キー拒否）

### 3. バンドルサイズ検証

#### Tree-shaking戦略の試行

| 試行         | import戦略                                              | バンドルサイズ | 差分       | 結果        |
| ------------ | ------------------------------------------------------- | -------------- | ---------- | ----------- |
| ベースライン | なし                                                    | 15660KB        | -          | -           |
| 試行1        | `import * as v from 'valibot'`                          | 15856KB        | **+196KB** | ❌ 39倍超過 |
| 試行2        | 個別import（`import { safeParse, strictObject, ... }`） | 15852KB        | **+192KB** | ❌ 38倍超過 |

#### 原因分析

- **@vercel/ncc** (v0.38.4) でのCJSバンドルでは、Valibotライブラリ全体（約200KB）が含まれる
- 個別import戦略でも、Tree-shakingが十分に機能せず（わずか4KBの改善）
- 設計書では ncc 0.40+ を推奨していたが、2025年10月時点で未リリース

### 4. トレードオフ分析

| 項目           | Valibot導入          | 手動型ガード（現状維持） |
| -------------- | -------------------- | ------------------------ |
| バンドルサイズ | **+192KB** ❌        | **0KB** ✅               |
| 型安全性       | strictモード ✅      | 基本的なチェック ⚠️      |
| メンテナンス性 | スキーマ自動追従 ✅  | 手動更新必要 ⚠️          |
| 要件適合性     | **不適合**（≤5KB）❌ | **適合** ✅              |

---

## 決定理由

### 主要理由

1. **バンドルサイズ制約違反**
   - 要件: 増加≤5KB
   - 実測: **+192KB**（目標の38倍超過）
   - GitHub Actions環境での実行時間・コスト増加

2. **代替手段の存在**
   - 現在の手動型ガード（`!!e && typeof e === 'object' && 'type' in e && e.type === 'ComplexityAnalysisError'`）で実用上問題なし
   - TypeScript strict modeで型安全性は十分確保されている

3. **費用対効果**
   - 200KBのコスト増加に対し、得られるメリット（スキーマ自動追従）が限定的
   - ComplexityAnalysisError型の変更頻度は低い

### 副次的考慮事項

- ncc 0.40+ がリリースされれば状況改善の可能性あり（将来的な再検討余地）
- より軽量なバリデーションライブラリ（tiny-invariant等）の検討も選択肢

---

## 実施した作業

### ロールバック内容

1. ✅ `valibot` 依存関係を削除
2. ✅ `src/schemas/errors.ts` 削除
3. ✅ `__tests__/schemas/errors.test.ts` 削除
4. ✅ `src/errors.ts` の `isComplexityAnalysisError` を手動型ガードに復元
5. ✅ バンドルサイズ確認: **15660KB**（ベースラインに復帰）

### 品質確認

- ✅ `pnpm lint`: エラー0件
- ✅ `pnpm type-check`: エラー0件
- ✅ `pnpm test`: 377テスト全通過
- ✅ `pnpm build`: 成功（バンドルサイズ15660KB）

---

## 学び・知見

### 技術的知見

1. **CJSバンドルとTree-shaking**
   - @vercel/ncc (v0.38.4) では、Valibotのような大規模ライブラリのTree-shakingが不十分
   - 個別import戦略（`import { ... }`）でも大幅な改善は見られず

2. **バンドルサイズの重要性**
   - GitHub Actions環境では、バンドルサイズが実行時間・コストに直結
   - 5KB制約は現実的な判断基準

3. **手動型ガードの実用性**
   - TypeScript strict mode環境では、手動型ガードでも十分な型安全性を確保可能
   - 保守性とのトレードオフを考慮した判断が重要

### プロセス知見

1. **TDD実践**
   - RED → GREEN → REFACTOR サイクルでテストを先行実装
   - スキーマテスト19件、型ガードテスト追加で品質担保

2. **要件遵守の重要性**
   - バンドルサイズ≤5KBは明確な要件として定義されていた
   - 要件違反（38倍超過）は受容不可能と正しく判断

---

## 将来的な再検討条件

以下の条件が満たされた場合、Valibot導入を再検討する価値がある：

1. **@vercel/ncc 0.40+のリリース**
   - より優れたTree-shaking対応が期待される
   - バンドルサイズが5KB以内に収まる可能性

2. **より軽量な代替ライブラリの登場**
   - Valibot以外の選択肢（例: tiny-invariant ~1KB）
   - バンドルサイズとのバランスが取れたライブラリ

3. **バンドルサイズ制約の緩和**
   - GitHub Actions環境の改善
   - ビジネス要件の変更

---

## 参照

- **Issue**: [#14 型ガード・バリデーションライブラリ（Valibot）の導入検討](https://github.com/jey3dayo/pr-labeler/issues/14)
- **仕様**: `.kiro/specs/valibot-validation-migration/`
  - `requirements.md`: 要件定義
  - `design.md`: 技術設計
  - `tasks.md`: 実装タスク（導入前提）
- **実装ブランチ**: `feature/valibot-validation-migration`

---

**最終更新:** 2025-10-20
**決定者:** 開発チーム
**ステータス:** 確定（導入見送り）
