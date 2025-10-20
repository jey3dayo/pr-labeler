/**
 * Directory-Based Labeler: 設定ローダー
 *
 * YAML設定ファイルの読み込み、パース、バリデーションを担当
 */

import fs from 'node:fs';

import * as core from '@actions/core';
import { load as yamlLoad } from 'js-yaml';

import {
  createConfigurationError,
  createFileSystemError,
  err,
  extractErrorMessage,
  ok,
  type Result,
} from '../errors/index.js';
import {
  DEFAULT_NAMESPACES,
  DEFAULT_OPTIONS,
  type DirectoryLabelerConfig,
  type MinimatchOptions,
  type NamespacePolicy,
} from './types.js';

/**
 * Directory-Based Labeler設定ファイルを読み込む
 *
 * @param configPath - 設定ファイルのパス
 * @returns 検証済みの設定オブジェクトまたはエラー
 */
export function loadDirectoryLabelerConfig(
  configPath: string,
): Result<
  DirectoryLabelerConfig,
  ReturnType<typeof createFileSystemError> | ReturnType<typeof createConfigurationError>
> {
  // ファイル存在チェック
  if (!fs.existsSync(configPath)) {
    return err(createFileSystemError(`Configuration file not found: ${configPath}`, configPath));
  }

  // ファイル読み込み
  let fileContent: string;
  try {
    fileContent = fs.readFileSync(configPath, 'utf-8');
  } catch (error) {
    const message = extractErrorMessage(error);
    return err(createFileSystemError(`Failed to read configuration file: ${message}`, configPath));
  }

  // YAMLパース
  let rawConfig: unknown;
  try {
    // 安全モード: DEFAULT_SCHEMAでYAMLアンカー/エイリアス、マージキーをサポート、任意コード実行は防止
    rawConfig = yamlLoad(fileContent);
  } catch (error) {
    const message = extractErrorMessage(error);
    return err(createConfigurationError('yaml', fileContent, `YAML parse error: ${message}`));
  }

  // バリデーション
  const validationResult = validateDirectoryLabelerConfig(rawConfig);
  if (validationResult.isErr()) {
    return validationResult;
  }

  const validatedConfig = validationResult.value;

  // デフォルト値の適用
  const configWithDefaults = applyDefaults(validatedConfig);

  return ok(configWithDefaults);
}

/**
 * プロパティが文字列であることを検証
 */
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * プロパティが数値であることを検証
 */
function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

/**
 * プロパティがブール値であることを検証
 */
function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Directory-Based Labeler設定をバリデーションする
 *
 * @param config - バリデーション対象の設定
 * @returns 検証済み設定またはエラー
 */
export function validateDirectoryLabelerConfig(
  config: unknown,
): Result<DirectoryLabelerConfig, ReturnType<typeof createConfigurationError>> {
  // 型ガード: オブジェクトであることを確認
  if (!config || typeof config !== 'object') {
    return err(createConfigurationError('config', config, 'Configuration must be an object'));
  }

  const cfg = config as Record<string, unknown>;

  // versionフィールドの必須チェック
  const version = cfg['version'];
  if (!('version' in cfg)) {
    return err(createConfigurationError('version', version, 'Field "version" is required'));
  }

  // versionは1のみ許可
  if (version !== 1) {
    return err(createConfigurationError('version', version, 'Field "version" must be 1 (current schema version)'));
  }

  // rulesフィールドの必須チェック
  const rules = cfg['rules'];
  if (!('rules' in cfg)) {
    return err(createConfigurationError('rules', rules, 'Field "rules" is required'));
  }

  // rulesは配列でなければならない
  if (!Array.isArray(rules)) {
    return err(createConfigurationError('rules', rules, 'Field "rules" must be an array'));
  }

  // 空のrulesは許可（警告ログのみ）
  if (rules.length === 0) {
    core.warning('Configuration has no rules defined. No labels will be applied.');
  }

  // 各ルールのバリデーション
  const labelsSeen = new Set<string>();
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];

    if (!rule || typeof rule !== 'object') {
      return err(createConfigurationError(`rules[${i}]`, rule, `Rule at index ${i} must be an object`));
    }

    const r = rule as Record<string, unknown>;

    // labelフィールドの必須チェック
    const label = r['label'];
    if (!('label' in r) || !isString(label)) {
      return err(
        createConfigurationError(
          `rules[${i}].label`,
          label,
          `Field "label" is required and must be a string in rule at index ${i}`,
        ),
      );
    }

    // 同一ラベル名の重複検出（警告のみ）
    if (labelsSeen.has(label)) {
      core.warning(`Duplicate label "${label}" found in rules. The first definition will be prioritized.`);
    }
    labelsSeen.add(label);

    // includeフィールドの必須チェック
    const include = r['include'];
    if (!('include' in r)) {
      return err(
        createConfigurationError(`rules[${i}].include`, include, `Field "include" is required in rule at index ${i}`),
      );
    }

    // includeは非空配列でなければならない
    if (!Array.isArray(include) || include.length === 0) {
      return err(
        createConfigurationError(
          `rules[${i}].include`,
          include,
          `Field "include" must be a non-empty array in rule at index ${i}`,
        ),
      );
    }

    // includeの各要素は文字列でなければならない
    for (let j = 0; j < include.length; j++) {
      const pattern = include[j];
      if (!isString(pattern)) {
        return err(
          createConfigurationError(
            `rules[${i}].include[${j}]`,
            pattern,
            `Include pattern at index ${j} in rule ${i} must be a string`,
          ),
        );
      }
    }

    // excludeは配列または未定義
    const exclude = r['exclude'];
    if ('exclude' in r && exclude !== undefined) {
      if (!Array.isArray(exclude)) {
        return err(
          createConfigurationError(
            `rules[${i}].exclude`,
            exclude,
            `Field "exclude" must be an array in rule at index ${i}`,
          ),
        );
      }

      // excludeの各要素は文字列でなければならない
      for (let j = 0; j < exclude.length; j++) {
        const pattern = exclude[j];
        if (!isString(pattern)) {
          return err(
            createConfigurationError(
              `rules[${i}].exclude[${j}]`,
              pattern,
              `Exclude pattern at index ${j} in rule ${i} must be a string`,
            ),
          );
        }
      }
    }

    // priorityは数値型または未定義
    const priority = r['priority'];
    if ('priority' in r && priority !== undefined && !isNumber(priority)) {
      return err(
        createConfigurationError(
          `rules[${i}].priority`,
          priority,
          `Field "priority" must be a number in rule at index ${i}`,
        ),
      );
    }
  }

  // optionsフィールドのバリデーション（省略可）
  const options = cfg['options'];
  if ('options' in cfg && options !== undefined) {
    if (typeof options !== 'object' || options === null) {
      return err(createConfigurationError('options', options, 'Field "options" must be an object'));
    }

    const opts = options as Record<string, unknown>;

    const dot = opts['dot'];
    if ('dot' in opts && dot !== undefined && !isBoolean(dot)) {
      return err(createConfigurationError('options.dot', dot, 'Field "options.dot" must be a boolean'));
    }

    const nocase = opts['nocase'];
    if ('nocase' in opts && nocase !== undefined && !isBoolean(nocase)) {
      return err(createConfigurationError('options.nocase', nocase, 'Field "options.nocase" must be a boolean'));
    }

    const matchBase = opts['matchBase'];
    if ('matchBase' in opts && matchBase !== undefined && !isBoolean(matchBase)) {
      return err(
        createConfigurationError('options.matchBase', matchBase, 'Field "options.matchBase" must be a boolean'),
      );
    }
  }

  // namespacesフィールドのバリデーション（省略可）
  const namespaces = cfg['namespaces'];
  if ('namespaces' in cfg && namespaces !== undefined) {
    if (typeof namespaces !== 'object' || namespaces === null) {
      return err(createConfigurationError('namespaces', namespaces, 'Field "namespaces" must be an object'));
    }

    const ns = namespaces as Record<string, unknown>;

    const exclusive = ns['exclusive'];
    if ('exclusive' in ns && exclusive !== undefined) {
      if (!Array.isArray(exclusive)) {
        return err(
          createConfigurationError('namespaces.exclusive', exclusive, 'Field "namespaces.exclusive" must be an array'),
        );
      }

      for (let i = 0; i < exclusive.length; i++) {
        const namespace = exclusive[i];
        if (!isString(namespace)) {
          return err(
            createConfigurationError(
              `namespaces.exclusive[${i}]`,
              namespace,
              `Namespace at index ${i} in "namespaces.exclusive" must be a string`,
            ),
          );
        }
      }
    }

    const additive = ns['additive'];
    if ('additive' in ns && additive !== undefined) {
      if (!Array.isArray(additive)) {
        return err(
          createConfigurationError('namespaces.additive', additive, 'Field "namespaces.additive" must be an array'),
        );
      }

      for (let i = 0; i < additive.length; i++) {
        const namespace = additive[i];
        if (!isString(namespace)) {
          return err(
            createConfigurationError(
              `namespaces.additive[${i}]`,
              namespace,
              `Namespace at index ${i} in "namespaces.additive" must be a string`,
            ),
          );
        }
      }
    }
  }

  // バリデーション成功: 型アサーション
  // この時点で全フィールドのバリデーションが完了しているため安全
  return ok(cfg as unknown as DirectoryLabelerConfig);
}

/**
 * デフォルト値を適用する
 *
 * @param config - バリデーション済み設定
 * @returns デフォルト値が適用された設定
 */
function applyDefaults(config: DirectoryLabelerConfig): DirectoryLabelerConfig {
  const options: Required<MinimatchOptions> = {
    ...DEFAULT_OPTIONS,
    ...(config.options || {}),
  };

  const namespaces: Required<NamespacePolicy> = {
    ...DEFAULT_NAMESPACES,
    ...(config.namespaces || {}),
  };

  return {
    ...config,
    options,
    namespaces,
    useDefaultExcludes: config.useDefaultExcludes !== false, // デフォルトtrue
  };
}
