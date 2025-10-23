import { Result } from 'neverthrow';
import type { ParseError } from '../errors';
export declare function parseSize(input: string): Result<number, ParseError>;
