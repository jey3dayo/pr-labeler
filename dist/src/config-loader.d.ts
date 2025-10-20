import { ResultAsync } from 'neverthrow';
import { ConfigurationError } from './errors/index.js';
import type { LabelerConfig } from './labeler-types.js';
export declare function loadConfig(token: string, owner: string, repo: string, ref: string): ResultAsync<LabelerConfig, ConfigurationError>;
export declare function parseYamlConfig(content: string): ResultAsync<LabelerConfig, ConfigurationError>;
export declare function validateLabelerConfig(config: unknown): ResultAsync<LabelerConfig, ConfigurationError>;
export declare function mergeWithDefaults(userConfig: Partial<LabelerConfig>): LabelerConfig;
export declare function getDefaultLabelerConfig(): LabelerConfig;
