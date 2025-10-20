import { createPatternError, type Result } from '../errors.js';
import { type DirectoryLabelerConfig } from './types.js';
export interface LabelDecision {
    label: string;
    matchedPattern: string;
    matchedPatterns?: string[];
    matchedFiles: string[];
    priority: number;
    matchLength: number;
}
export declare function decideLabelsForFiles(files: string[], config: DirectoryLabelerConfig): Result<LabelDecision[], ReturnType<typeof createPatternError>>;
export declare function filterByMaxLabels(decisions: LabelDecision[], maxLabels: number): {
    selected: LabelDecision[];
    rejected: Array<{
        label: string;
        reason: string;
    }>;
};
