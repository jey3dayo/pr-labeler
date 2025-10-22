export interface EnvironmentConfig {
    language: string | undefined;
    githubToken: string | undefined;
}
export declare function loadEnvironmentConfig(): EnvironmentConfig;
