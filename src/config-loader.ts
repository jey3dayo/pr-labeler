/**
 * Configuration loader for PR Labeler
 * Loads and validates .github/pr-labeler.yml configuration
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import * as yaml from 'js-yaml';
import { errAsync, okAsync, ResultAsync } from 'neverthrow';

import {
  ConfigurationError,
  createConfigurationError,
  extractErrorMessage,
  extractErrorStatus,
} from './errors/index.js';
import type { LabelerConfig } from './labeler-types.js';
import { DEFAULT_LABELER_CONFIG } from './labeler-types.js';

const CONFIG_FILE_PATH = '.github/pr-labeler.yml';
const MAX_CONFIG_SIZE = 1024 * 1024; // 1MB（DoS攻撃防止）

/**
 * Load labeler configuration from repository
 *
 * @param token - GitHub API token
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param ref - Git reference (e.g., "refs/heads/main")
 * @returns LabelerConfig or ConfigurationError
 */
export function loadConfig(
  token: string,
  owner: string,
  repo: string,
  ref: string,
): ResultAsync<LabelerConfig, ConfigurationError> {
  const octokit = github.getOctokit(token);

  return ResultAsync.fromPromise(
    octokit.rest.repos.getContent({
      owner,
      repo,
      path: CONFIG_FILE_PATH,
      ref,
    }),
    (error): ConfigurationError => {
      const status = extractErrorStatus(error);
      if (status === 404) {
        core.info(`Configuration file ${CONFIG_FILE_PATH} not found, using defaults`);
        return createConfigurationError(CONFIG_FILE_PATH, 'not found', 'Configuration file not found');
      }
      return createConfigurationError(
        CONFIG_FILE_PATH,
        error,
        `Failed to fetch configuration file: ${extractErrorMessage(error)}`,
      );
    },
  ).andThen(response => {
    // GitHub API returns file content in base64
    if (!('content' in response.data)) {
      return errAsync(
        createConfigurationError(CONFIG_FILE_PATH, response.data, 'Response does not contain file content'),
      );
    }

    const content = Buffer.from(response.data.content, 'base64').toString('utf-8');

    // Check file size limit (bytes)
    const byteLen = Buffer.byteLength(content, 'utf-8');
    if (byteLen > MAX_CONFIG_SIZE) {
      core.warning(`Configuration file exceeds size limit (${byteLen} > ${MAX_CONFIG_SIZE} bytes), using defaults`);
      return errAsync(createConfigurationError(CONFIG_FILE_PATH, byteLen, 'Configuration file too large'));
    }

    return parseYamlConfig(content);
  });
}

/**
 * Parse YAML configuration content
 *
 * @param content - YAML file content
 * @returns Parsed LabelerConfig or ConfigurationError
 */
export function parseYamlConfig(content: string): ResultAsync<LabelerConfig, ConfigurationError> {
  try {
    // Use JSON Schema mode to prevent dangerous YAML constructs like !!js/function
    const parsed = yaml.load(content, { schema: yaml.JSON_SCHEMA }) as unknown;

    if (parsed === null || parsed === undefined) {
      core.warning('Configuration file is empty, using defaults');
      return errAsync(createConfigurationError(CONFIG_FILE_PATH, parsed, 'Configuration file is empty'));
    }

    // Validate and sanitize configuration
    return validateLabelerConfig(parsed);
  } catch (error) {
    const err = error as Error;
    core.warning(`Failed to parse YAML configuration: ${err.message}, using defaults`);
    return errAsync(createConfigurationError(CONFIG_FILE_PATH, content, `YAML parse error: ${err.message}`));
  }
}

/**
 * Validate and sanitize labeler configuration
 *
 * @param config - Parsed configuration object
 * @returns Validated LabelerConfig or ConfigurationError
 */
export function validateLabelerConfig(config: unknown): ResultAsync<LabelerConfig, ConfigurationError> {
  // Type guard for basic structure
  if (typeof config !== 'object' || config === null) {
    return errAsync(createConfigurationError('root', config, 'Configuration must be an object'));
  }

  const cfg = config as Partial<LabelerConfig>;

  // Validate language field
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

  // Validate size thresholds
  if (cfg.size?.thresholds) {
    const { small, medium, large, xlarge } = cfg.size.thresholds;

    // Check for non-negative integers
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

    // Check threshold ordering: small < medium < large < xlarge
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

  // Validate complexity thresholds
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

    // Check threshold ordering: medium < high
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

  // Validate category patterns (minimatch syntax)
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

      // Validate display_name if present
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

        // Basic minimatch pattern validation (check for unmatched brackets)
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

  // Validate risk.use_ci_status type
  if (cfg.risk?.use_ci_status !== undefined && typeof cfg.risk.use_ci_status !== 'boolean') {
    return errAsync(
      createConfigurationError('risk.use_ci_status', cfg.risk.use_ci_status, 'risk.use_ci_status must be a boolean'),
    );
  }

  // Warn about unknown keys (future extension)
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
  const unknownKeys = Object.keys(config).filter(key => !knownKeys.includes(key));
  if (unknownKeys.length > 0) {
    core.warning(`Unknown configuration keys will be ignored: ${unknownKeys.join(', ')}`);
  }

  // Merge with defaults
  const mergedConfig = mergeWithDefaults(cfg);

  return okAsync(mergedConfig);
}

/**
 * Validate minimatch pattern syntax
 *
 * @param pattern - Minimatch pattern string
 * @returns True if pattern is valid
 */
function isValidMinimatchPattern(pattern: string): boolean {
  // Basic validation: check for unmatched brackets
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

/**
 * Merge user configuration with defaults
 *
 * @param userConfig - Partial user configuration
 * @returns Complete LabelerConfig with defaults applied
 */
export function mergeWithDefaults(userConfig: Partial<LabelerConfig>): LabelerConfig {
  return {
    ...(userConfig.language !== undefined && { language: userConfig.language }), // Preserve language if specified
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

/**
 * Get default labeler configuration
 * Used when configuration file is not found or fails to parse
 *
 * @returns Default LabelerConfig (deep copy to prevent mutations)
 */
export function getDefaultLabelerConfig(): LabelerConfig {
  return JSON.parse(JSON.stringify(DEFAULT_LABELER_CONFIG));
}
