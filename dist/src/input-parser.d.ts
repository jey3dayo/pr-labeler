import { type Result } from 'neverthrow';
import type { ConfigurationError, ParseError } from './errors/index.js';
export interface ParsedInputs {
    language: string | undefined;
    githubToken: string;
    fileSizeLimit: number;
    fileLinesLimit: number;
    prAdditionsLimit: number;
    prFilesLimit: number;
    sizeEnabled: boolean;
    complexityEnabled: boolean;
    categoryEnabled: boolean;
    riskEnabled: boolean;
    sizeThresholdsV2: {
        small: number;
        medium: number;
        large: number;
        xlarge: number;
    };
    complexityThresholdsV2: {
        medium: number;
        high: number;
    };
    autoRemoveLabels: boolean;
    largeFilesLabel: string;
    tooManyFilesLabel: string;
    tooManyLinesLabel: string;
    excessiveChangesLabel: string;
    skipDraftPr: boolean;
    commentOnPr: 'auto' | 'always' | 'never';
    failOnLargeFiles: boolean;
    failOnTooManyFiles: boolean;
    failOnPrSize: string;
    enableSummary: boolean;
    additionalExcludePatterns: string[];
    enableDirectoryLabeling: boolean;
    directoryLabelerConfigPath: string;
    maxLabels: number;
    useDefaultExcludes: boolean;
}
export declare function parseActionInputs(): Result<ParsedInputs, ConfigurationError | ParseError>;
