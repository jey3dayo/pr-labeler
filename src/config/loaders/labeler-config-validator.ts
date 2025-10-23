import * as core from '@actions/core';
import { errAsync, okAsync, ResultAsync } from 'neverthrow';

import { type ConfigurationError, createConfigurationError } from '../../errors/index.js';
import type { LabelerConfig } from '../../labeler-types.js';
import { DEFAULT_LABELER_CONFIG } from '../../labeler-types.js';

/**
 * Validate and sanitize labeler configuration
 */
export function validateLabelerConfig(config: unknown): ResultAsync<LabelerConfig, ConfigurationError> {
  if (typeof config !== 'object' || config === null) {
    return errAsync(createConfigurationError('root', config, 'Configuration must be an object'));
  }

  const cfg = config as Partial<LabelerConfig>;

  if (cfg.language !== undefined) {
    if (typeof cfg.language !== 'string') {
      return errAsync(createConfigurationError('language', cfg.language, 'language must be a string'));
    }
    const lang = String(cfg.language).toLowerCase();
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

  if (cfg.size?.thresholds) {
    const { small, medium, large, xlarge } = cfg.size.thresholds;

    if (small !== undefined && (typeof small !== 'number' || small < 0 || !Number.isInteger(small))) {
      return errAsync(
        createConfigurationError(
          'size.thresholds.small',
          small,
          'size.thresholds.small must be a non-negative integer',
        ),
      );
    }
    if (medium !== undefined && (typeof medium !== 'number' || medium < 0 || !Number.isInteger(medium))) {
      return errAsync(
        createConfigurationError(
          'size.thresholds.medium',
          medium,
          'size.thresholds.medium must be a non-negative integer',
        ),
      );
    }
    if (large !== undefined && (typeof large !== 'number' || large < 0 || !Number.isInteger(large))) {
      return errAsync(
        createConfigurationError(
          'size.thresholds.large',
          large,
          'size.thresholds.large must be a non-negative integer',
        ),
      );
    }
    if (xlarge !== undefined && (typeof xlarge !== 'number' || xlarge < 0 || !Number.isInteger(xlarge))) {
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

    if (medium !== undefined && (typeof medium !== 'number' || medium < 0 || !Number.isInteger(medium))) {
      return errAsync(
        createConfigurationError(
          'complexity.thresholds.medium',
          medium,
          'complexity.thresholds.medium must be a non-negative integer',
        ),
      );
    }
    if (high !== undefined && (typeof high !== 'number' || high < 0 || !Number.isInteger(high))) {
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
      if (!category || typeof category !== 'object') {
        return errAsync(createConfigurationError(`categories[${i}]`, category, 'Category config must be an object'));
      }

      const cat = category as { label?: unknown; patterns?: unknown; display_name?: unknown };

      if (typeof cat.label !== 'string') {
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
        if (typeof cat.display_name !== 'object' || cat.display_name === null) {
          return errAsync(
            createConfigurationError(
              `categories[${i}].display_name`,
              cat.display_name,
              'display_name must be an object',
            ),
          );
        }

        const displayName = cat.display_name as { en?: unknown; ja?: unknown };

        if (typeof displayName.en !== 'string') {
          return errAsync(
            createConfigurationError(
              `categories[${i}].display_name.en`,
              displayName.en,
              'display_name.en must be a string',
            ),
          );
        }

        if (typeof displayName.ja !== 'string') {
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
        if (typeof pattern !== 'string') {
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

  if (cfg.risk?.use_ci_status !== undefined && typeof cfg.risk.use_ci_status !== 'boolean') {
    return errAsync(
      createConfigurationError('risk.use_ci_status', cfg.risk.use_ci_status, 'risk.use_ci_status must be a boolean'),
    );
  }

  const knownKeys = [
    'language',
    'size',
    'complexity',
    'categoryLabeling',
    'categories',
    'risk',
    'exclude',
    'labels',
    'runtime',
  ];
  const unknownKeys = Object.keys(config as Record<string, unknown>).filter(key => !knownKeys.includes(key));
  if (unknownKeys.length > 0) {
    core.warning(`Unknown configuration keys will be ignored: ${unknownKeys.join(', ')}`);
  }

  return okAsync(mergeWithDefaults(cfg));
}

export function mergeWithDefaults(userConfig: Partial<LabelerConfig>): LabelerConfig {
  return {
    ...(userConfig.language !== undefined && { language: userConfig.language }),
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
