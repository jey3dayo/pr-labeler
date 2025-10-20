/**
 * Directory-Based Labeler: セキュアロギング
 *
 * トークン、URL、個人識別子のマスキング処理を担当
 */

/**
 * センシティブデータをマスキング
 *
 * 以下のパターンをマスキングします：
 * - GitHubトークン（ghp_*, ghs_*, gho_*, ghu_*, ghr_*, etc.）
 * - URLパラメータのトークン
 * - Authorization ヘッダー
 * - メールアドレス
 *
 * @param message - マスキング対象のメッセージ
 * @returns マスキング済みのメッセージ
 */
export function maskSensitiveData(message: string): string {
  let masked = message;

  // GitHubトークンのマスキング（ghp_*, ghs_*, gho_*, ghu_*, ghr_*, ghv_*, ghi_*）
  masked = masked.replace(/gh[a-z]_[A-Za-z0-9_]+/g, '***');

  // URLパラメータのトークン（token=*, access_token=*, etc.）
  masked = masked.replace(/([?&])(token|access_token|api_key|apikey|key)=[^&\s]+/gi, '$1$2=***');

  // Authorization ヘッダー（Bearer, Basic, etc.）
  masked = masked.replace(/Authorization:\s*(Bearer|Basic|Token)\s+[^\s]+/gi, 'Authorization: $1 ***');

  // メールアドレスのマスキング
  masked = masked.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '***@***.***');

  return masked;
}
