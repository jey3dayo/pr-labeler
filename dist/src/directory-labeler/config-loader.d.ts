import { createConfigurationError, createFileSystemError, type Result } from '../errors.js';
import { type DirectoryLabelerConfig } from './types.js';
export declare function loadDirectoryLabelerConfig(configPath: string): Result<DirectoryLabelerConfig, ReturnType<typeof createFileSystemError> | ReturnType<typeof createConfigurationError>>;
export declare function validateDirectoryLabelerConfig(config: unknown): Result<DirectoryLabelerConfig, ReturnType<typeof createConfigurationError>>;
