type ErrorConstructor<T extends Error = Error> = new (message: string) => T;
export declare function ensureError<T extends Error>(error: unknown, defaultMessage?: string, ErrorClass?: ErrorConstructor<T>): T;
export declare function extractAggregateError(error: unknown): Error;
export {};
