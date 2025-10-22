/**
 * i18n初期化とコア機能のテスト
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  changeLanguage,
  getCurrentLanguage,
  getLabelDisplayName,
  initializeI18n,
  isInitialized,
  normalizeLanguageCode,
  resetI18n,
  t,
} from '../src/i18n';
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

  // determineLanguage() は削除されたため、テストも削除

  describe('initializeI18n', () => {
    it('should initialize successfully with English', () => {
      resetI18n(); // 明示的にリセット

      const result = initializeI18n('en');

      expect(result.isOk()).toBe(true);
      expect(isInitialized()).toBe(true);
      expect(getCurrentLanguage()).toBe('en');
    });

    it('should initialize successfully with Japanese', () => {
      resetI18n(); // 明示的にリセット

      const result = initializeI18n('ja');

      expect(result.isOk()).toBe(true);
      expect(isInitialized()).toBe(true);
      expect(getCurrentLanguage()).toBe('ja');
    });

    it('should be idempotent (multiple calls are safe)', () => {
      const result1 = initializeI18n('en');
      const result2 = initializeI18n('ja');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      // 2回目の呼び出しで言語が変更される
      expect(getCurrentLanguage()).toBe('ja');
    });

    it('should handle language switching correctly', () => {
      resetI18n();

      const result1 = initializeI18n('en');
      expect(result1.isOk()).toBe(true);
      expect(getCurrentLanguage()).toBe('en');

      // 言語を切り替え
      const result2 = initializeI18n('ja');
      expect(result2.isOk()).toBe(true);
      expect(getCurrentLanguage()).toBe('ja');
    });
  });

  describe('t (translation function)', () => {
    beforeEach(() => {
      initializeI18n('en');
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
      initializeI18n('en');
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
