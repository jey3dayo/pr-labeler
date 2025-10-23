import { ResultAsync } from 'neverthrow';

import type { ConfigurationError } from './errors/index.js';
import type { LabelerConfig } from './labeler-types.js';
import {
  CONFIG_FILE_PATH,
  fetchRepositoryConfig,
  type FetchRepositoryConfigParams,
} from './config/loaders/github-config-fetcher.js';
import { parseYamlContent } from './config/loaders/yaml-config-parser.js';
import {
  mergeWithDefaults,
  validateLabelerConfig,
} from './config/loaders/labeler-config-validator.js';

export { CONFIG_FILE_PATH, mergeWithDefaults, validateLabelerConfig };

/**
 * Load labeler configuration from repository
 */
export function loadConfig(
  token: string,
  owner: string,
  repo: string,
  ref: string,
): ResultAsync<LabelerConfig, ConfigurationError> {
  const params: FetchRepositoryConfigParams = { token, owner, repo, ref };

  return fetchRepositoryConfig(params).andThen(content => parseYamlConfig(content));
}

/**
 * Parse YAML configuration content and validate result
 */
export function parseYamlConfig(content: string): ResultAsync<LabelerConfig, ConfigurationError> {
  return parseYamlContent(content).andThen(validateLabelerConfig);
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
