import type { SizeThresholdsV2 } from './input-mapper.js';
export declare const SIZE_ORDER: readonly ["small", "medium", "large", "xlarge", "xxlarge"];
export type SizeValue = (typeof SIZE_ORDER)[number];
export declare function compareSizeThreshold(appliedSize: string, threshold: string): boolean;
export declare function calculateSizeCategory(totalAdditions: number, thresholds: SizeThresholdsV2): string;
