export type ErrorLevel = 'warning' | 'info';
export declare abstract class BaseError extends Error {
    readonly errorLevel: ErrorLevel;
    constructor(message: string, errorLevel?: ErrorLevel);
}
