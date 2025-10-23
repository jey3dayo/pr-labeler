import type { Violations } from '../../errors/index.js';
import type { FileMetrics } from '../../types/analysis.js';
import { escapeMarkdown } from './common.js';
export declare function formatFileDetails(files: FileMetrics[], limit?: number): string;
export declare function formatFileAnalysis(violations: Violations, files: FileMetrics[], limit?: number): string;
export { escapeMarkdown };
