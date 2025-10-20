/**
 * npm-check-updates configuration
 * Controls which packages should not be automatically updated
 */

module.exports = {
  upgrade: false,
  reject: [
    // p-limit - v3.1.0に固定（CommonJS互換性維持）
    // v4以降はESM-onlyとなり、@vercel/nccでのバンドル時にコード分割が発生
    // 単一ファイルバンドルを維持するため、v3系を使用
    'p-limit',
  ],
};
