import { ResultAsync } from 'neverthrow';
import { CONFIG_FILE_PATH } from './config/loaders/github-config-fetcher.js';
import { mergeWithDefaults, validateLabelerConfig } from './config/loaders/labeler-config-validator.js';
import type { ConfigurationError } from './errors/index.js';
import type { LabelerConfig } from './labeler-types.js';
export { CONFIG_FILE_PATH, mergeWithDefaults, validateLabelerConfig };
export declare function loadConfig(token: string, owner: string, repo: string, ref: string): ResultAsync<LabelerConfig, ConfigurationError>;
export declare function parseYamlConfig(content: string): ResultAsync<LabelerConfig, ConfigurationError>;
export declare function getDefaultLabelerConfig(): LabelerConfig;
