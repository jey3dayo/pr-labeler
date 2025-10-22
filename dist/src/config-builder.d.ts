import type { EnvironmentConfig } from './environment-loader.js';
import type { Config } from './input-mapper.js';
import type { ParsedInputs } from './input-parser.js';
import type { LabelerConfig } from './labeler-types.js';
import type { LanguageCode } from './types/i18n.js';
export interface CompleteConfig extends Omit<Config, 'language'> {
    language: LanguageCode;
}
export declare function buildCompleteConfig(parsedInputs: ParsedInputs, labelerConfig: LabelerConfig, envConfig: EnvironmentConfig): CompleteConfig;
