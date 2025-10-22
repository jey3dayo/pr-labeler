import { type Result } from 'neverthrow';
import type { ConfigurationError } from './errors/types.js';
import type { LanguageCode, Namespace } from './types/i18n.js';
export declare function normalizeLanguageCode(lang: string): LanguageCode;
export declare function initializeI18n(language: LanguageCode): Result<void, ConfigurationError>;
export declare function t(namespace: Namespace, key: string, options?: Record<string, unknown>): string;
export declare function getCurrentLanguage(): LanguageCode;
export declare function isInitialized(): boolean;
export declare function changeLanguage(lang: LanguageCode): void;
export declare function resetI18n(): void;
export declare function getLabelDisplayName(labelName: string, categories: Array<{
    label: string;
    display_name?: {
        en: string;
        ja: string;
    };
}>): string;
