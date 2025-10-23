export interface SizeThresholds {
    small: number;
    medium: number;
    large: number;
    xlarge: number;
}
export declare function calculateSizeLabel(additions: number, thresholds: SizeThresholds): string;
