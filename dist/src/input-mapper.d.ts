import { Result } from 'neverthrow';
import type { ActionInputs } from './actions-io';
import type { ConfigurationError, ParseError } from './errors';
export interface SizeThresholds {
    S: {
        additions: number;
        files: number;
    };
    M: {
        additions: number;
        files: number;
    };
    L: {
        additions: number;
        files: number;
    };
}
export interface Config {
    fileSizeLimit: number;
    fileLinesLimit: number;
    prAdditionsLimit: number;
    prFilesLimit: number;
    applyLabels: boolean;
    autoRemoveLabels: boolean;
    applySizeLabels: boolean;
    sizeThresholds: SizeThresholds;
    largeFilesLabel: string;
    tooManyFilesLabel: string;
    skipDraftPr: boolean;
    commentOnPr: 'auto' | 'always' | 'never';
    failOnViolation: boolean;
    enableSummary: boolean;
    additionalExcludePatterns: string[];
    githubToken: string;
}
export declare function parseBoolean(value: string): boolean;
export declare function parseCommentMode(value: string): 'auto' | 'always' | 'never';
export declare function parseExcludePatterns(value: string): string[];
export declare function parseSizeThresholds(value: string): Result<SizeThresholds, ParseError>;
export declare function mapActionInputsToConfig(inputs: ActionInputs): Result<Config, ConfigurationError | ParseError>;
