import { ResultAsync } from 'neverthrow';
import { type ConfigurationError } from '../../errors/index.js';
import type { LabelerConfig } from '../../labeler-types.js';
export declare function validateLabelerConfig(config: unknown): ResultAsync<LabelerConfig, ConfigurationError>;
export declare function mergeWithDefaults(userConfig: Partial<LabelerConfig>): LabelerConfig;
