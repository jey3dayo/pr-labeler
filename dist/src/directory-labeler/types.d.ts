import { DEFAULT_EXCLUDES, DEFAULT_NAMESPACES, DEFAULT_OPTIONS } from '../configs/directory-labeler-defaults.js';
export { DEFAULT_EXCLUDES, DEFAULT_NAMESPACES, DEFAULT_OPTIONS };
export interface MinimatchOptions {
    dot?: boolean;
    nocase?: boolean;
    matchBase?: boolean;
}
export interface LabelRule {
    label: string;
    include: string[];
    exclude?: string[];
    priority?: number;
}
export interface NamespacePolicy {
    exclusive: string[];
    additive: string[];
}
export interface DirectoryLabelerConfig {
    version: 1;
    options?: MinimatchOptions;
    rules: LabelRule[];
    namespaces?: NamespacePolicy;
    useDefaultExcludes?: boolean;
}
export declare const INTERNAL_PATH_SEPARATOR: "/";
