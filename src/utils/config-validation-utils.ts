/**
 * Configuration Validation Utilities
 *
 * 設定バリデーションの共通パターンを提供するユーティリティ
 */

import * as core from '@actions/core';
import { err, errAsync, ok, okAsync, type Result, type ResultAsync } from 'neverthrow';

/**
 * 汎用的な設定バリデーション関数（同期版）
 * パーサー関数を実行し、エラーチェック、警告処理を行う
 *
 * @template TConfig - バリデーション済み設定の型
 * @template TError - エラーの型
 * @param config - バリデーション対象の設定（unknown型）
 * @param transformer - 設定をパース・検証するトランスフォーマー関数
 * @returns バリデーション済み設定またはエラー
 */
export function validateConfigWithTransformer<TConfig, TError>(
  config: unknown,
  transformer: (config: unknown) => Result<{ config: TConfig; warnings: string[] }, TError>,
): Result<TConfig, TError> {
  const transformResult = transformer(config);
  if (transformResult.isErr()) {
    return err(transformResult.error);
  }

  const { config: validatedConfig, warnings } = transformResult.value;
  warnings.forEach(message => core.warning(message));
  return ok(validatedConfig);
}

/**
 * 汎用的な設定バリデーション関数（非同期版）
 * パーサー関数を実行し、エラーチェック、警告処理を行う
 *
 * @template TConfig - バリデーション済み設定の型
 * @template TError - エラーの型
 * @param config - バリデーション対象の設定（unknown型）
 * @param transformer - 設定をパース・検証するトランスフォーマー関数
 * @returns バリデーション済み設定またはエラー（非同期）
 */
export function validateConfigWithTransformerAsync<TConfig, TError>(
  config: unknown,
  transformer: (config: unknown) => Result<{ config: TConfig; warnings: string[] }, TError>,
): ResultAsync<TConfig, TError> {
  const transformResult = transformer(config);
  if (transformResult.isErr()) {
    return errAsync(transformResult.error);
  }

  const { config: validatedConfig, warnings } = transformResult.value;
  warnings.forEach(message => core.warning(message));
  return okAsync(validatedConfig);
}
