/**
 * Directory-Based Labeler: Secure Loggingのユニットテスト
 */

import { describe, expect, test } from 'vitest';

import { maskSensitiveData } from '../../src/directory-labeler/logging.js';

describe('Directory-Based Labeler: Secure Logging', () => {
  describe('maskSensitiveData', () => {
    test('GitHubトークンをマスキング', () => {
      const message = 'Using token: ghp_1234567890abcdefghijklmnopqrstuv';
      const masked = maskSensitiveData(message);
      expect(masked).toBe('Using token: ***');
    });

    test('GitHub Appトークンをマスキング', () => {
      const message = 'Token: ghs_1234567890abcdefghijklmnopqrstuv';
      const masked = maskSensitiveData(message);
      expect(masked).toBe('Token: ***');
    });

    test('URLのトークンパラメータをマスキング', () => {
      const message = 'API call to https://api.github.com/repos/owner/repo?token=secret123';
      const masked = maskSensitiveData(message);
      expect(masked).not.toContain('secret123');
      expect(masked).toContain('***');
    });

    test('Authorization ヘッダーをマスキング', () => {
      const message = 'Headers: Authorization: Bearer ghp_secrettoken123';
      const masked = maskSensitiveData(message);
      expect(masked).not.toContain('ghp_secrettoken123');
      expect(masked).toContain('***');
    });

    test('複数のトークンをすべてマスキング', () => {
      const message = 'Token1: ghp_abc123, Token2: ghs_xyz789';
      const masked = maskSensitiveData(message);
      expect(masked).not.toContain('ghp_abc123');
      expect(masked).not.toContain('ghs_xyz789');
      expect(masked).toBe('Token1: ***, Token2: ***');
    });

    test('センシティブデータがない場合はそのまま返す', () => {
      const message = 'Normal log message without sensitive data';
      const masked = maskSensitiveData(message);
      expect(masked).toBe(message);
    });

    test('空文字列をマスキング', () => {
      const masked = maskSensitiveData('');
      expect(masked).toBe('');
    });

    test('メールアドレスをマスキング', () => {
      const message = 'User email: user@example.com reported an issue';
      const masked = maskSensitiveData(message);
      expect(masked).not.toContain('user@example.com');
      expect(masked).toContain('***@***.***');
    });
  });
});
