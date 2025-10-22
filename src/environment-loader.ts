/**
 * Environment Loader
 *
 * 環境変数から設定を読み込む
 * process.env への唯一のアクセスポイント
 */

/**
 * 環境変数から読み込まれた設定
 */
export interface EnvironmentConfig {
  /** LANGUAGE または LANG 環境変数 */
  language: string | undefined;

  /** GITHUB_TOKEN または GH_TOKEN 環境変数 */
  githubToken: string | undefined;
}

/**
 * 環境変数から設定を読み込む
 *
 * 優先順位:
 * - language: LANGUAGE > LANG
 * - githubToken: GITHUB_TOKEN > GH_TOKEN
 *
 * @returns 環境変数設定
 *
 * @example
 * const envConfig = loadEnvironmentConfig();
 * console.log(envConfig.language); // 'ja' | 'en' | undefined
 */
export function loadEnvironmentConfig(): EnvironmentConfig {
  return {
    language: process.env['LANGUAGE'] || process.env['LANG'] || undefined,
    githubToken: process.env['GITHUB_TOKEN'] || process.env['GH_TOKEN'] || undefined,
  };
}
