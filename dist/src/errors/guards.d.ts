import type { ComplexityAnalysisError } from './types.js';
export declare function isError(error: unknown): error is Error;
export declare function isObject(value: unknown): value is object;
export declare function isString(value: unknown): value is string;
export declare function isErrorWithMessage(obj: unknown): obj is {
    message: string;
};
export declare function isErrorWithTypeAndMessage(obj: unknown): obj is {
    type: string;
    message: string;
};
export declare function isComplexityAnalysisError(e: unknown): e is ComplexityAnalysisError;
