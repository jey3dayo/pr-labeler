import { err, ok, type Result } from 'neverthrow';

import { type ConfigurationError, createConfigurationError } from '../errors/index.js';

/**
 * オブジェクト入力のバリデーション
 * 設定がオブジェクトであることを確認
 */
export function validateObjectInput(
  config: unknown,
  fieldPath: string,
): Result<Record<string, unknown>, ConfigurationError> {
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    return err(createConfigurationError(fieldPath, config, 'Configuration must be an object'));
  }
  return ok(config as Record<string, unknown>);
}

/**
 * 配列フィールドのバリデーション
 * フィールドが配列であることを確認し、各要素を検証
 */
export function validateArrayField<T>(
  source: Record<string, unknown>,
  fieldName: string,
  fieldPath: string,
  elementValidator: (element: unknown, index: number) => Result<T, ConfigurationError>,
): Result<T[] | undefined, ConfigurationError> {
  if (!(fieldName in source)) {
    return ok(undefined);
  }

  const value = source[fieldName];
  if (!Array.isArray(value)) {
    return err(createConfigurationError(fieldPath, value, `${fieldName} must be an array`));
  }

  const validated: T[] = [];
  for (let i = 0; i < value.length; i++) {
    const elementResult = elementValidator(value[i], i);
    if (elementResult.isErr()) {
      return err(elementResult.error);
    }
    validated.push(elementResult.value);
  }

  return ok(validated);
}

/**
 * 数値閾値のバリデーション
 * 数値が指定された範囲内にあることを確認
 */
export function validateNumericThreshold(
  value: unknown,
  fieldPath: string,
  min: number,
  max: number,
  options?: {
    integerOnly?: boolean;
  },
): Result<number, ConfigurationError> {
  if (typeof value !== 'number') {
    return err(createConfigurationError(fieldPath, value, 'Must be a number'));
  }

  if (options?.integerOnly && !Number.isInteger(value)) {
    return err(createConfigurationError(fieldPath, value, 'Must be an integer'));
  }

  if (value < min || value > max) {
    return err(createConfigurationError(fieldPath, value, `Must be between ${min} and ${max}, but got ${value}`));
  }

  return ok(value);
}

/**
 * 未知キーの収集
 * 設定オブジェクト内の未知のキーを収集して警告メッセージを生成
 */
export function collectUnknownKeys(source: Record<string, unknown>, knownKeys: readonly string[]): string[] {
  const unknownKeys = Object.keys(source).filter(key => !knownKeys.includes(key));
  if (unknownKeys.length > 0) {
    return [`Unknown configuration keys will be ignored: ${unknownKeys.join(', ')}`];
  }
  return [];
}
