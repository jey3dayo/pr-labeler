/**
 * i18n初期化とコア機能のテスト
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  changeLanguage,
  determineLanguage,
  getCurrentLanguage,
  getLabelDisplayName,
  initializeI18n,
  isInitialized,
  normalizeLanguageCode,
  resetI18n,
  t,
} from '../src/i18n';
import type { Config } from '../src/input-mapper';
import type { CategoryConfig } from '../src/labeler-types';

describe('i18n Core Functions', () => {
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

  describe('normalizeLanguageCode', () => {
    it('should normalize ja-JP to ja', () => {
      expect(normalizeLanguageCode('ja-JP')).toBe('ja');
    });

    it('should normalize en-US to en', () => {
      expect(normalizeLanguageCode('en-US')).toBe('en');
    });

    it('should handle already normalized codes', () => {
      expect(normalizeLanguageCode('ja')).toBe('ja');
      expect(normalizeLanguageCode('en')).toBe('en');
    });

    it('should handle uppercase codes', () => {
      expect(normalizeLanguageCode('JA')).toBe('ja');
      expect(normalizeLanguageCode('EN')).toBe('en');
    });

    it('should fallback to en for unsupported languages', () => {
      expect(normalizeLanguageCode('fr')).toBe('en');
      expect(normalizeLanguageCode('zh-CN')).toBe('en');
      expect(normalizeLanguageCode('invalid')).toBe('en');
    });
  });

  describe('determineLanguage', () => {
    it('should prioritize LANGUAGE environment variable', () => {
      process.env['LANGUAGE'] = 'ja-JP';
      process.env['LANG'] = 'en-US';

      const config: Partial<Config> = {
        language: 'en',
      };

      expect(determineLanguage(config as Config)).toBe('ja');
    });

    it('should use LANG when LANGUAGE is not set', () => {
      delete process.env['LANGUAGE'];
      process.env['LANG'] = 'ja-JP';

      const config: Config = {
        language: 'en',
      } as Config;

      expect(determineLanguage(config)).toBe('ja');
    });

    it('should use config when environment variables are not set', () => {
      delete process.env['LANGUAGE'];
      delete process.env['LANG'];

      const config: Config = {
        language: 'ja',
      } as Config;

      expect(determineLanguage(config)).toBe('ja');
    });

    it('should default to en when no language is specified', () => {
      resetI18n(); // i18nをリセット
      delete process.env['LANGUAGE'];
      delete process.env['LANG'];

      const config: Config = {} as Config;

      expect(determineLanguage(config)).toBe('en');
    });

    it('should normalize language codes from all sources', () => {
      process.env['LANGUAGE'] = 'JA-JP';

      const config: Config = {} as Config;

      expect(determineLanguage(config)).toBe('ja');
    });
  });

  describe('initializeI18n', () => {
    it('should initialize successfully with English', () => {
      resetI18n(); // 明示的にリセット
      // CI環境の環境変数をクリア
      delete process.env['LANGUAGE'];
      delete process.env['LANG'];

      const config: Config = {
        language: 'en',
      } as Config;

      const result = initializeI18n(config);

      expect(result.isOk()).toBe(true);
      expect(isInitialized()).toBe(true);
      expect(getCurrentLanguage()).toBe('en');
    });

    it('should initialize successfully with Japanese', () => {
      resetI18n(); // 明示的にリセット
      // CI環境の環境変数をクリア
      delete process.env['LANGUAGE'];
      delete process.env['LANG'];

      const config: Config = {
        language: 'ja',
      } as Config;

      const result = initializeI18n(config);

      expect(result.isOk()).toBe(true);
      expect(isInitialized()).toBe(true);
      expect(getCurrentLanguage()).toBe('ja');
    });

    it('should use environment variable for language selection', () => {
      process.env['LANGUAGE'] = 'ja';

      const config: Config = {
        language: 'en',
      } as Config;

      const result = initializeI18n(config);

      expect(result.isOk()).toBe(true);
      expect(getCurrentLanguage()).toBe('ja');
    });

    it('should be idempotent (multiple calls are safe)', () => {
      const config: Config = {
        language: 'en',
      } as Config;

      const result1 = initializeI18n(config);
      const result2 = initializeI18n(config);

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
    });
  });

  describe('t (translation function)', () => {
    beforeEach(() => {
      const config: Config = {
        language: 'en',
      } as Config;
      initializeI18n(config);
      // 明示的に英語に変更
      changeLanguage('en');
    });

    it('should translate basic keys in English', () => {
      const result = t('summary', 'basicMetrics.title');
      expect(result).toBe('Basic Metrics');
    });

    it('should handle nested keys', () => {
      const result = t('summary', 'complexity.level.high');
      expect(result).toBe('high');
    });

    it('should support interpolation', () => {
      const result = t('summary', 'violations.filesExceedSize', { count: 5 });
      expect(result).toContain('5');
      expect(result).toContain('file(s) exceed size limit');
    });

    it('should return fallback for invalid keys', () => {
      const result = t('summary', 'nonexistent.key');
      // i18nextのフォールバック動作に依存
      expect(result).toBeTruthy();
    });
  });

  describe('getCurrentLanguage', () => {
    it('should return en when not initialized', () => {
      // 新しいプロセスでテストする必要があるため、このテストはスキップ
      // （初期化済みの状態をリセットする方法がない）
      expect(getCurrentLanguage()).toBe('en');
    });
  });

  describe('getLabelDisplayName', () => {
    beforeEach(() => {
      // 英語で初期化
      const config: Config = {
        language: 'en',
        github_token: 'dummy',
        repository: 'owner/repo',
        pr_number: 1,
        skip_draft_pr: false,
        apply_labels: true,
        comment_on_pr: 'auto',
        enable_summary: true,
        file_size_limit: 1000,
        file_lines_limit: 500,
        pr_additions_limit: 1000,
        pr_files_limit: 50,
        additional_exclude_patterns: [],
        size_label_thresholds: null,
        size_enabled: true,
        complexity_enabled: false,
        complexity_thresholds: null,
        category_enabled: true,
        risk_enabled: false,
        risk_thresholds: null,
      };
      initializeI18n(config);
    });

    it('should return custom display_name from category config (English)', () => {
      // 確実に英語にリセット
      changeLanguage('en');

      const category: CategoryConfig = {
        label: 'category/tests',
        patterns: ['**/*.test.ts'],
        display_name: {
          en: 'Test Files',
          ja: 'テストファイル',
        },
      };

      const result = getLabelDisplayName('category/tests', [category]);
      expect(result).toBe('Test Files');
    });

    it('should return custom display_name from category config (Japanese)', () => {
      changeLanguage('ja');

      const category: CategoryConfig = {
        label: 'category/tests',
        patterns: ['**/*.test.ts'],
        display_name: {
          en: 'Test Files',
          ja: 'テストファイル',
        },
      };

      const result = getLabelDisplayName('category/tests', [category]);
      expect(result).toBe('テストファイル');
    });

    it('should fall back to labels namespace translation', () => {
      // display_nameなしのカテゴリ
      const category: CategoryConfig = {
        label: 'category/tests',
        patterns: ['**/*.test.ts'],
      };

      const result = getLabelDisplayName('category/tests', [category]);
      // labels名前空間に翻訳がある場合はそれを使用、なければラベル名そのまま
      expect(result).toBeTruthy();
    });

    it('should return label name if no display_name and no translation', () => {
      const category: CategoryConfig = {
        label: 'category/custom',
        patterns: ['**/*.custom'],
      };

      const result = getLabelDisplayName('category/custom', [category]);
      expect(result).toBe('category/custom');
    });

    it('should handle empty categories array', () => {
      const result = getLabelDisplayName('size/small', []);
      // labels名前空間に翻訳がある場合はそれを使用、なければラベル名そのまま
      expect(result).toBeTruthy();
    });
  });
});
