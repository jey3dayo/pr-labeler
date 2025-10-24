import * as core from '@actions/core';
import { errAsync, okAsync, ResultAsync } from 'neverthrow';

import { type ConfigurationError, createConfigurationError } from '../../errors/index.js';
import type { LabelerConfig } from '../../labeler-types.js';
import { DEFAULT_LABELER_CONFIG } from '../../labeler-types.js';
import { isBoolean, isNumber, isRecord, isString } from '../../utils/type-guards.js';

/**
 * Validate and sanitize labeler configuration
 */
export function validateLabelerConfig(config: unknown): ResultAsync<LabelerConfig, ConfigurationError> {
  if (!isRecord(config)) {
    return errAsync(createConfigurationError('root', config, 'Configuration must be an object'));
  }

  const cfg = config as Partial<LabelerConfig>;

  if (cfg.language !== undefined) {
    if (!isString(cfg.language)) {
      return errAsync(createConfigurationError('language', cfg.language, 'language must be a string'));
    }
    const lang = cfg.language.toLowerCase();
    const isEn = /^en(?:[-_].+)?$/.test(lang);
    const isJa = /^ja(?:[-_].+)?$/.test(lang);
    if (!isEn && !isJa) {
      return errAsync(
        createConfigurationError(
          'language',
          cfg.language,
          "language must start with 'en' or 'ja' (e.g., 'en', 'en-US', 'ja', 'ja-JP')",
        ),
      );
    }
  }

  if (cfg.summary !== undefined) {
    if (!isRecord(cfg.summary)) {
      return errAsync(createConfigurationError('summary', cfg.summary, 'summary must be an object'));
    }

    const summaryRecord = cfg.summary as Record<string, unknown>;
    if ('title' in summaryRecord && summaryRecord['title'] !== undefined && !isString(summaryRecord['title'])) {
      return errAsync(
        createConfigurationError('summary.title', summaryRecord['title'], 'summary.title must be a string'),
      );
    }
  }

  if (cfg.size?.thresholds) {
    const { small, medium, large, xlarge } = cfg.size.thresholds;

    if (small !== undefined && (!isNumber(small) || small < 0 || !Number.isInteger(small))) {
      return errAsync(
        createConfigurationError(
          'size.thresholds.small',
          small,
          'size.thresholds.small must be a non-negative integer',
        ),
      );
    }
    if (medium !== undefined && (!isNumber(medium) || medium < 0 || !Number.isInteger(medium))) {
      return errAsync(
        createConfigurationError(
          'size.thresholds.medium',
          medium,
          'size.thresholds.medium must be a non-negative integer',
        ),
      );
    }
    if (large !== undefined && (!isNumber(large) || large < 0 || !Number.isInteger(large))) {
      return errAsync(
        createConfigurationError(
          'size.thresholds.large',
          large,
          'size.thresholds.large must be a non-negative integer',
        ),
      );
    }
    if (xlarge !== undefined && (!isNumber(xlarge) || xlarge < 0 || !Number.isInteger(xlarge))) {
      return errAsync(
        createConfigurationError(
          'size.thresholds.xlarge',
          xlarge,
          'size.thresholds.xlarge must be a non-negative integer',
        ),
      );
    }

    const finalSmall = small ?? DEFAULT_LABELER_CONFIG.size.thresholds.small;
    const finalMedium = medium ?? DEFAULT_LABELER_CONFIG.size.thresholds.medium;
    const finalLarge = large ?? DEFAULT_LABELER_CONFIG.size.thresholds.large;
    const finalXLarge = xlarge ?? DEFAULT_LABELER_CONFIG.size.thresholds.xlarge;

    if (finalSmall >= finalMedium) {
      return errAsync(
        createConfigurationError(
          'size.thresholds',
          { small: finalSmall, medium: finalMedium },
          `size.thresholds.small (${finalSmall}) must be less than medium (${finalMedium})`,
        ),
      );
    }
    if (finalMedium >= finalLarge) {
      return errAsync(
        createConfigurationError(
          'size.thresholds',
          { medium: finalMedium, large: finalLarge },
          `size.thresholds.medium (${finalMedium}) must be less than large (${finalLarge})`,
        ),
      );
    }
    if (finalLarge >= finalXLarge) {
      return errAsync(
        createConfigurationError(
          'size.thresholds',
          { large: finalLarge, xlarge: finalXLarge },
          `size.thresholds.large (${finalLarge}) must be less than xlarge (${finalXLarge})`,
        ),
      );
    }
  }

  if (cfg.complexity?.thresholds) {
    const { medium, high } = cfg.complexity.thresholds;

    if (medium !== undefined && (!isNumber(medium) || medium < 0 || !Number.isInteger(medium))) {
      return errAsync(
        createConfigurationError(
          'complexity.thresholds.medium',
          medium,
          'complexity.thresholds.medium must be a non-negative integer',
        ),
      );
    }
    if (high !== undefined && (!isNumber(high) || high < 0 || !Number.isInteger(high))) {
      return errAsync(
        createConfigurationError(
          'complexity.thresholds.high',
          high,
          'complexity.thresholds.high must be a non-negative integer',
        ),
      );
    }

    const finalMedium = medium ?? DEFAULT_LABELER_CONFIG.complexity.thresholds.medium;
    const finalHigh = high ?? DEFAULT_LABELER_CONFIG.complexity.thresholds.high;

    if (finalMedium >= finalHigh) {
      return errAsync(
        createConfigurationError(
          'complexity.thresholds',
          { medium: finalMedium, high: finalHigh },
          `complexity.thresholds.medium (${finalMedium}) must be less than high (${finalHigh})`,
        ),
      );
    }
  }

  if (cfg.categories) {
    if (!Array.isArray(cfg.categories)) {
      return errAsync(createConfigurationError('categories', cfg.categories, 'categories must be an array'));
    }

    for (let i = 0; i < cfg.categories.length; i++) {
      const category = cfg.categories[i];
      if (!isRecord(category)) {
        return errAsync(createConfigurationError(`categories[${i}]`, category, 'Category config must be an object'));
      }

      const cat = category as { label?: unknown; patterns?: unknown; display_name?: unknown };

      if (!isString(cat.label)) {
        return errAsync(
          createConfigurationError(`categories[${i}].label`, cat.label, 'Category label must be a string'),
        );
      }

      if (!Array.isArray(cat.patterns)) {
        return errAsync(
          createConfigurationError(`categories[${i}].patterns`, cat.patterns, 'Category patterns must be an array'),
        );
      }

      if (cat.display_name !== undefined) {
        if (!isRecord(cat.display_name)) {
          return errAsync(
            createConfigurationError(
              `categories[${i}].display_name`,
              cat.display_name,
              'display_name must be an object',
            ),
          );
        }

        const displayName = cat.display_name as { en?: unknown; ja?: unknown };

        if (!isString(displayName.en)) {
          return errAsync(
            createConfigurationError(
              `categories[${i}].display_name.en`,
              displayName.en,
              'display_name.en must be a string',
            ),
          );
        }

        if (!isString(displayName.ja)) {
          return errAsync(
            createConfigurationError(
              `categories[${i}].display_name.ja`,
              displayName.ja,
              'display_name.ja must be a string',
            ),
          );
        }
      }

      for (let j = 0; j < cat.patterns.length; j++) {
        const pattern = cat.patterns[j];
        if (!isString(pattern)) {
          return errAsync(
            createConfigurationError(`categories[${i}].patterns[${j}]`, pattern, 'Pattern must be a string'),
          );
        }

        if (!isValidMinimatchPattern(pattern)) {
          return errAsync(
            createConfigurationError(
              `categories[${i}].patterns[${j}]`,
              pattern,
              `Invalid minimatch pattern: ${pattern}`,
            ),
          );
        }
      }
    }
  }

  if (cfg.categoryLabeling !== undefined) {
    if (!isRecord(cfg.categoryLabeling)) {
      return errAsync(
        createConfigurationError('categoryLabeling', cfg.categoryLabeling, 'categoryLabeling must be an object'),
      );
    }

    const categoryLabeling = cfg.categoryLabeling as { enabled?: unknown };

    if (categoryLabeling.enabled === undefined || !isBoolean(categoryLabeling.enabled)) {
      return errAsync(
        createConfigurationError(
          'categoryLabeling.enabled',
          categoryLabeling.enabled,
          'categoryLabeling.enabled must be a boolean',
        ),
      );
    }
  }

  if (cfg.risk !== undefined) {
    if (!isRecord(cfg.risk)) {
      return errAsync(createConfigurationError('risk', cfg.risk, 'risk must be an object'));
    }

    const risk = cfg.risk as {
      enabled?: unknown;
      high_if_no_tests_for_core?: unknown;
      core_paths?: unknown;
      config_files?: unknown;
      use_ci_status?: unknown;
    };

    if (risk.enabled !== undefined && !isBoolean(risk.enabled)) {
      return errAsync(createConfigurationError('risk.enabled', risk.enabled, 'risk.enabled must be a boolean'));
    }

    if (risk.high_if_no_tests_for_core !== undefined && !isBoolean(risk.high_if_no_tests_for_core)) {
      return errAsync(
        createConfigurationError(
          'risk.high_if_no_tests_for_core',
          risk.high_if_no_tests_for_core,
          'risk.high_if_no_tests_for_core must be a boolean',
        ),
      );
    }

    if (risk.use_ci_status !== undefined && !isBoolean(risk.use_ci_status)) {
      return errAsync(
        createConfigurationError('risk.use_ci_status', risk.use_ci_status, 'risk.use_ci_status must be a boolean'),
      );
    }

    const finalCorePaths = risk.core_paths ?? DEFAULT_LABELER_CONFIG.risk.core_paths;
    if (!Array.isArray(finalCorePaths)) {
      return errAsync(createConfigurationError('risk.core_paths', risk.core_paths, 'risk.core_paths must be an array'));
    }

    for (let i = 0; i < finalCorePaths.length; i++) {
      const path = finalCorePaths[i];
      if (!isString(path) || path.trim() === '') {
        return errAsync(
          createConfigurationError(`risk.core_paths[${i}]`, path, 'risk.core_paths entries must be non-empty strings'),
        );
      }
    }

    const finalConfigFiles = risk.config_files ?? DEFAULT_LABELER_CONFIG.risk.config_files;
    if (!Array.isArray(finalConfigFiles)) {
      return errAsync(
        createConfigurationError('risk.config_files', risk.config_files, 'risk.config_files must be an array'),
      );
    }

    for (let i = 0; i < finalConfigFiles.length; i++) {
      const filePattern = finalConfigFiles[i];
      if (!isString(filePattern) || filePattern.trim() === '') {
        return errAsync(
          createConfigurationError(
            `risk.config_files[${i}]`,
            filePattern,
            'risk.config_files entries must be non-empty strings',
          ),
        );
      }
    }
  }

  if (cfg.exclude !== undefined) {
    if (!isRecord(cfg.exclude)) {
      return errAsync(createConfigurationError('exclude', cfg.exclude, 'exclude must be an object'));
    }

    const exclude = cfg.exclude as { additional?: unknown };

    if (exclude.additional !== undefined) {
      if (!Array.isArray(exclude.additional)) {
        return errAsync(
          createConfigurationError('exclude.additional', exclude.additional, 'exclude.additional must be an array'),
        );
      }

      const additional = exclude.additional as unknown[];
      for (let i = 0; i < additional.length; i++) {
        const pattern = additional[i];
        if (!isString(pattern) || pattern.trim() === '') {
          return errAsync(
            createConfigurationError(
              `exclude.additional[${i}]`,
              pattern,
              'exclude.additional entries must be non-empty strings',
            ),
          );
        }
      }
    }
  }

  if (cfg.labels !== undefined) {
    if (!isRecord(cfg.labels)) {
      return errAsync(createConfigurationError('labels', cfg.labels, 'labels must be an object'));
    }

    const labelsConfig = cfg.labels as { create_missing?: unknown; namespace_policies?: unknown };

    if (labelsConfig.create_missing !== undefined && !isBoolean(labelsConfig.create_missing)) {
      return errAsync(
        createConfigurationError(
          'labels.create_missing',
          labelsConfig.create_missing,
          'labels.create_missing must be a boolean',
        ),
      );
    }

    if (labelsConfig.namespace_policies !== undefined) {
      if (!isRecord(labelsConfig.namespace_policies)) {
        return errAsync(
          createConfigurationError(
            'labels.namespace_policies',
            labelsConfig.namespace_policies,
            'labels.namespace_policies must be an object',
          ),
        );
      }

      const namespacePolicies = labelsConfig.namespace_policies as Record<string, unknown>;
      for (const [pattern, policy] of Object.entries(namespacePolicies)) {
        if (pattern.trim() === '') {
          return errAsync(
            createConfigurationError(
              'labels.namespace_policies',
              labelsConfig.namespace_policies,
              'labels.namespace_policies keys must be non-empty strings',
            ),
          );
        }

        if (!isString(policy)) {
          return errAsync(
            createConfigurationError(
              `labels.namespace_policies['${pattern}']`,
              policy,
              "labels.namespace_policies values must be 'replace' or 'additive'",
            ),
          );
        }

        if (policy !== 'replace' && policy !== 'additive') {
          return errAsync(
            createConfigurationError(
              `labels.namespace_policies['${pattern}']`,
              policy,
              "labels.namespace_policies values must be 'replace' or 'additive'",
            ),
          );
        }
      }
    }
  }

  if (cfg.runtime !== undefined) {
    if (!isRecord(cfg.runtime)) {
      return errAsync(createConfigurationError('runtime', cfg.runtime, 'runtime must be an object'));
    }

    const runtime = cfg.runtime as { fail_on_error?: unknown; dry_run?: unknown };

    if (runtime.fail_on_error !== undefined && !isBoolean(runtime.fail_on_error)) {
      return errAsync(
        createConfigurationError(
          'runtime.fail_on_error',
          runtime.fail_on_error,
          'runtime.fail_on_error must be a boolean',
        ),
      );
    }

    if (runtime.dry_run !== undefined && !isBoolean(runtime.dry_run)) {
      return errAsync(
        createConfigurationError('runtime.dry_run', runtime.dry_run, 'runtime.dry_run must be a boolean'),
      );
    }
  }

  const knownKeys = [
    'language',
    'summary',
    'size',
    'complexity',
    'categoryLabeling',
    'categories',
    'risk',
    'exclude',
    'labels',
    'runtime',
  ];
  const unknownKeys = Object.keys(config).filter(key => !knownKeys.includes(key));
  if (unknownKeys.length > 0) {
    core.warning(`Unknown configuration keys will be ignored: ${unknownKeys.join(', ')}`);
  }

  return okAsync(mergeWithDefaults(cfg));
}

export function mergeWithDefaults(userConfig: Partial<LabelerConfig>): LabelerConfig {
  return {
    ...(userConfig.language !== undefined && { language: userConfig.language }),
    ...(userConfig.summary?.title
      ? {
          summary: {
            title: userConfig.summary.title,
          },
        }
      : {}),
    size: {
      enabled: userConfig.size?.enabled ?? DEFAULT_LABELER_CONFIG.size.enabled,
      thresholds: {
        small: userConfig.size?.thresholds?.small ?? DEFAULT_LABELER_CONFIG.size.thresholds.small,
        medium: userConfig.size?.thresholds?.medium ?? DEFAULT_LABELER_CONFIG.size.thresholds.medium,
        large: userConfig.size?.thresholds?.large ?? DEFAULT_LABELER_CONFIG.size.thresholds.large,
        xlarge: userConfig.size?.thresholds?.xlarge ?? DEFAULT_LABELER_CONFIG.size.thresholds.xlarge,
      },
    },
    complexity: {
      enabled: userConfig.complexity?.enabled ?? DEFAULT_LABELER_CONFIG.complexity.enabled,
      metric: userConfig.complexity?.metric ?? DEFAULT_LABELER_CONFIG.complexity.metric,
      thresholds: {
        medium: userConfig.complexity?.thresholds?.medium ?? DEFAULT_LABELER_CONFIG.complexity.thresholds.medium,
        high: userConfig.complexity?.thresholds?.high ?? DEFAULT_LABELER_CONFIG.complexity.thresholds.high,
      },
      extensions: userConfig.complexity?.extensions ?? DEFAULT_LABELER_CONFIG.complexity.extensions,
      exclude: userConfig.complexity?.exclude ?? DEFAULT_LABELER_CONFIG.complexity.exclude,
    },
    categoryLabeling: {
      enabled: userConfig.categoryLabeling?.enabled ?? DEFAULT_LABELER_CONFIG.categoryLabeling.enabled,
    },
    categories: userConfig.categories ?? DEFAULT_LABELER_CONFIG.categories,
    risk: {
      enabled: userConfig.risk?.enabled ?? DEFAULT_LABELER_CONFIG.risk.enabled,
      high_if_no_tests_for_core:
        userConfig.risk?.high_if_no_tests_for_core ?? DEFAULT_LABELER_CONFIG.risk.high_if_no_tests_for_core,
      core_paths: userConfig.risk?.core_paths ?? DEFAULT_LABELER_CONFIG.risk.core_paths,
      ...(userConfig.risk?.coverage_threshold !== undefined && {
        coverage_threshold: userConfig.risk.coverage_threshold,
      }),
      config_files: userConfig.risk?.config_files ?? DEFAULT_LABELER_CONFIG.risk.config_files,
      ...(userConfig.risk?.use_ci_status !== undefined && {
        use_ci_status: userConfig.risk.use_ci_status,
      }),
    },
    exclude: {
      additional: userConfig.exclude?.additional ?? DEFAULT_LABELER_CONFIG.exclude.additional,
    },
    labels: {
      create_missing: userConfig.labels?.create_missing ?? DEFAULT_LABELER_CONFIG.labels.create_missing,
      namespace_policies: userConfig.labels?.namespace_policies ?? DEFAULT_LABELER_CONFIG.labels.namespace_policies,
    },
    runtime: {
      fail_on_error: userConfig.runtime?.fail_on_error ?? DEFAULT_LABELER_CONFIG.runtime.fail_on_error,
      dry_run: userConfig.runtime?.dry_run ?? DEFAULT_LABELER_CONFIG.runtime.dry_run,
    },
  };
}

function isValidMinimatchPattern(pattern: string): boolean {
  const openBraces = (pattern.match(/\{/g) || []).length;
  const closeBraces = (pattern.match(/\}/g) || []).length;
  const openBrackets = (pattern.match(/\[/g) || []).length;
  const closeBrackets = (pattern.match(/\]/g) || []).length;

  if (openBraces !== closeBraces) {
    return false;
  }
  if (openBrackets !== closeBrackets) {
    return false;
  }

  return true;
}
