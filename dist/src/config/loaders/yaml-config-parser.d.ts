import { ResultAsync } from 'neverthrow';
import { type ConfigurationError } from '../../errors/index.js';
export declare function parseYamlContent(content: string): ResultAsync<unknown, ConfigurationError>;
