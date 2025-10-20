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
}
export declare const DEFAULT_OPTIONS: Required<MinimatchOptions>;
export declare const DEFAULT_NAMESPACES: Required<NamespacePolicy>;
export declare const DEFAULT_EXCLUDES: readonly string[];
export declare const INTERNAL_PATH_SEPARATOR: "/";
