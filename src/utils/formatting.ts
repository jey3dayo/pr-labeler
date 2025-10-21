/**
 * フォーマットユーティリティ
 *
 * 数値、ファイルサイズのロケール形式フォーマット機能を提供します。
 */

import { getCurrentLanguage } from '../i18n.js';
import type { LanguageCode } from '../types/i18n.js';

/**
 * 言語コードからロケール文字列への変換マップ
 */
const LOCALE_MAP: Record<LanguageCode, string> = {
  en: 'en-US',
  ja: 'ja-JP',
};

/**
 * 数値をロケール形式でフォーマット
 *
 * @param value - 数値
 * @param lang - 言語コード (省略時は現在の選択言語)
 * @returns フォーマットされた文字列
 *
 * @example
 * formatNumber(1000, 'en') // => "1,000"
 * formatNumber(1000, 'ja') // => "1,000"
 */
export function formatNumber(value: number, lang?: LanguageCode): string {
  const language = lang ?? getCurrentLanguage();
  const locale = LOCALE_MAP[language];

  return new Intl.NumberFormat(locale).format(value);
}

/**
 * ファイルサイズをロケール形式でフォーマット（1024基数）
 *
 * @param bytes - バイト数
 * @param lang - 言語コード (省略時は現在の選択言語)
 * @returns フォーマットされた文字列（数値と単位の間に半角スペース1つ）
 *
 * @remarks
 * - 基数: 1024（バイナリ単位）
 * - 単位: B, KB, MB, GB（英語・日本語共通）
 * - フォーマット: "{数値} {単位}" （例: "1 KB", "100.5 MB"）
 * - 小数点以下: 最大1桁
 *
 * @example
 * formatFileSize(1024, 'en') // => "1 KB"
 * formatFileSize(1536, 'ja') // => "1.5 KB"
 * formatFileSize(1048576, 'en') // => "1 MB"
 */
export function formatFileSize(bytes: number, lang?: LanguageCode): string {
  const language = lang ?? getCurrentLanguage();
  const locale = LOCALE_MAP[language];

  const units = ['B', 'KB', 'MB', 'GB']; // 英語・日本語共通の単位
  let size = bytes;
  let unitIndex = 0;

  // 1024基数で単位を上げる
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  // 数値をロケール形式でフォーマット（小数点以下最大1桁）
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  }).format(size);

  // 数値と単位の間に半角スペース1つ
  return `${formatted} ${units[unitIndex]}`;
}
