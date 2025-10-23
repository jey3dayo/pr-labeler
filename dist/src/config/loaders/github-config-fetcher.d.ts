import { ResultAsync } from 'neverthrow';
import { type ConfigurationError } from '../../errors/index.js';
export declare const CONFIG_FILE_PATH = ".github/pr-labeler.yml";
export declare const MAX_CONFIG_SIZE: number;
export interface FetchRepositoryConfigParams {
    token: string;
    owner: string;
    repo: string;
    ref: string;
}
export declare function fetchRepositoryConfig(params: FetchRepositoryConfigParams): ResultAsync<string, ConfigurationError>;
