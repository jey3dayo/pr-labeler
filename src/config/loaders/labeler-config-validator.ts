import { ResultAsync } from 'neverthrow';

import { type ConfigurationError } from '../../errors/index.js';
import type { LabelerConfig } from '../../labeler-types.js';
import { DEFAULT_LABELER_CONFIG } from '../../labeler-types.js';
import { validateConfigWithTransformerAsync } from '../../utils/config-validation-utils.js';
import { parseLabelerConfig } from '../transformers/labeler-config-transformer.js';

/**
 * Validate and sanitize labeler configuration via transformer layer
 */
export function validateLabelerConfig(config: unknown): ResultAsync<LabelerConfig, ConfigurationError> {
  return validateConfigWithTransformerAsync(config, parseLabelerConfig).map(normalizedConfig =>
    mergeWithDefaults(normalizedConfig),
  );
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
