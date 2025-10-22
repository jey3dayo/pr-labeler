/**
 * Integration tests for Configuration Layer Pattern
 *
 * Tests the complete configuration flow:
 * 1. parseActionInputs() - Parse action inputs
 * 2. loadEnvironmentConfig() - Load environment variables
 * 3. loadConfig() - Load pr-labeler.yml
 * 4. buildCompleteConfig() - Build complete config with priority resolution
 * 5. initializeI18n() - Initialize i18n with language code
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { buildCompleteConfig } from '../src/config-builder.js';
import { loadEnvironmentConfig } from '../src/environment-loader.js';
import { initializeI18n, resetI18n } from '../src/i18n.js';
import type { ParsedInputs } from '../src/input-parser.js';
import type { LabelerConfig } from '../src/labeler-types.js';

describe('Configuration Integration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // 環境変数のバックアップ
    originalEnv = { ...process.env };
    // i18nをリセット
    resetI18n();
  });

  afterEach(() => {
    // 環境変数を復元
    process.env = originalEnv;
  });

  describe('Priority Chain: action input > labeler config > env > default', () => {
    it('should prioritize action input over labeler config and environment', () => {
      // Setup: 全てのソースに異なる値を設定
      process.env['LANGUAGE'] = 'ja'; // 環境変数

      const parsedInputs: Partial<ParsedInputs> = {
        language: 'en', // action input (最優先)
        githubToken: 'test-token',
        fileSizeLimit: 100000,
        fileLinesLimit: 500,
        prAdditionsLimit: 5000,
        prFilesLimit: 50,
      };

      const labelerConfig: Partial<LabelerConfig> = {
        language: 'ja', // labeler config
      };

      const envConfig = loadEnvironmentConfig();

      // Act: 設定を統合
      const config = buildCompleteConfig(parsedInputs as ParsedInputs, labelerConfig as LabelerConfig, envConfig);

      // Assert: action input が優先される
      expect(config.language).toBe('en');
    });

    it('should use labeler config when action input is undefined', () => {
      // Setup
      process.env['LANGUAGE'] = 'en'; // 環境変数

      const parsedInputs: Partial<ParsedInputs> = {
        language: undefined, // action input は未設定
        githubToken: 'test-token',
        fileSizeLimit: 100000,
        fileLinesLimit: 500,
        prAdditionsLimit: 5000,
        prFilesLimit: 50,
      };

      const labelerConfig: Partial<LabelerConfig> = {
        language: 'ja', // labeler config (優先される)
      };

      const envConfig = loadEnvironmentConfig();

      // Act
      const config = buildCompleteConfig(parsedInputs as ParsedInputs, labelerConfig as LabelerConfig, envConfig);

      // Assert: labeler config が優先される
      expect(config.language).toBe('ja');
    });

    it('should use environment when both action input and labeler config are undefined', () => {
      // Setup
      process.env['LANGUAGE'] = 'ja'; // 環境変数 (優先される)

      const parsedInputs: Partial<ParsedInputs> = {
        language: undefined, // action input は未設定
        githubToken: 'test-token',
        fileSizeLimit: 100000,
        fileLinesLimit: 500,
        prAdditionsLimit: 5000,
        prFilesLimit: 50,
      };

      const labelerConfig: Partial<LabelerConfig> = {
        language: undefined, // labeler config も未設定
      };

      const envConfig = loadEnvironmentConfig();

      // Act
      const config = buildCompleteConfig(parsedInputs as ParsedInputs, labelerConfig as LabelerConfig, envConfig);

      // Assert: environment が優先される
      expect(config.language).toBe('ja');
    });

    it('should use default when all sources are undefined', () => {
      // Setup
      delete process.env['LANGUAGE'];
      delete process.env['LANG'];

      const parsedInputs: Partial<ParsedInputs> = {
        language: undefined,
        githubToken: 'test-token',
        fileSizeLimit: 100000,
        fileLinesLimit: 500,
        prAdditionsLimit: 5000,
        prFilesLimit: 50,
      };

      const labelerConfig: Partial<LabelerConfig> = {
        language: undefined,
      };

      const envConfig = loadEnvironmentConfig();

      // Act
      const config = buildCompleteConfig(parsedInputs as ParsedInputs, labelerConfig as LabelerConfig, envConfig);

      // Assert: デフォルト値 'en' が使用される
      expect(config.language).toBe('en');
    });
  });

  describe('Language Code Normalization', () => {
    it('should normalize locale format from labeler config (ja-JP -> ja)', () => {
      // Setup
      const parsedInputs: Partial<ParsedInputs> = {
        language: undefined,
        githubToken: 'test-token',
        fileSizeLimit: 100000,
        fileLinesLimit: 500,
        prAdditionsLimit: 5000,
        prFilesLimit: 50,
      };

      const labelerConfig: Partial<LabelerConfig> = {
        language: 'ja-JP', // ロケール形式
      };

      const envConfig = loadEnvironmentConfig();

      // Act
      const config = buildCompleteConfig(parsedInputs as ParsedInputs, labelerConfig as LabelerConfig, envConfig);

      // Assert: 'ja-JP' が 'ja' に正規化される
      expect(config.language).toBe('ja');
    });

    it('should normalize locale format from environment (en-US -> en)', () => {
      // Setup
      process.env['LANGUAGE'] = 'en-US';

      const parsedInputs: Partial<ParsedInputs> = {
        language: undefined,
        githubToken: 'test-token',
        fileSizeLimit: 100000,
        fileLinesLimit: 500,
        prAdditionsLimit: 5000,
        prFilesLimit: 50,
      };

      const labelerConfig: Partial<LabelerConfig> = {
        language: undefined,
      };

      const envConfig = loadEnvironmentConfig();

      // Act
      const config = buildCompleteConfig(parsedInputs as ParsedInputs, labelerConfig as LabelerConfig, envConfig);

      // Assert: 'en-US' が 'en' に正規化される
      expect(config.language).toBe('en');
    });
  });

  describe('Bug Fix: LANGUAGE environment variable', () => {
    it('should respect LANGUAGE=ja environment variable', () => {
      // Setup: 以前は action.yml の default: "en" により、この環境変数が無視されていた
      process.env['LANGUAGE'] = 'ja';

      const parsedInputs: Partial<ParsedInputs> = {
        language: undefined, // action.yml の default 削除により、undefined になる
        githubToken: 'test-token',
        fileSizeLimit: 100000,
        fileLinesLimit: 500,
        prAdditionsLimit: 5000,
        prFilesLimit: 50,
      };

      const labelerConfig: Partial<LabelerConfig> = {
        language: undefined,
      };

      const envConfig = loadEnvironmentConfig();

      // Act
      const config = buildCompleteConfig(parsedInputs as ParsedInputs, labelerConfig as LabelerConfig, envConfig);

      // Assert: LANGUAGE=ja が正しく動作する
      expect(config.language).toBe('ja');
    });
  });

  describe('i18n Integration', () => {
    it('should initialize i18n with resolved language code', () => {
      // Setup
      process.env['LANGUAGE'] = 'ja';

      const parsedInputs: Partial<ParsedInputs> = {
        language: undefined,
        githubToken: 'test-token',
        fileSizeLimit: 100000,
        fileLinesLimit: 500,
        prAdditionsLimit: 5000,
        prFilesLimit: 50,
      };

      const labelerConfig: Partial<LabelerConfig> = {
        language: undefined,
      };

      const envConfig = loadEnvironmentConfig();

      // Act
      const config = buildCompleteConfig(parsedInputs as ParsedInputs, labelerConfig as LabelerConfig, envConfig);

      const result = initializeI18n(config.language);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(config.language).toBe('ja');
    });
  });
});
