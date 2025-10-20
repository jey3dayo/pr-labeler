/**
 * Report formatting utilities for GitHub Actions Summary and PR comments
 * Provides common markdown generation functions
 */

import type { Violations } from './errors/index.js';
import type { AnalysisResult, FileMetrics } from './file-metrics';
import type { ComplexityConfig, ComplexityMetrics } from './labeler-types';

/**
 * Summary context for generating GitHub URLs
 */
export interface SummaryContext {
  owner: string; // GitHubリポジトリのオーナー
  repo: string; // GitHubリポジトリ名
  sha: string; // コミットSHA
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return '0 B';
  }

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Format number with thousands separator
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Options for formatBasicMetrics
 */
export interface FormatBasicMetricsOptions {
  includeHeader?: boolean;
}

/**
 * Format basic metrics section
 * Displays PR additions, files analyzed, excluded files, and timestamp
 */
export function formatBasicMetrics(metrics: AnalysisResult['metrics'], options?: FormatBasicMetricsOptions): string {
  const { includeHeader = true } = options || {};
  let output = '';

  // Header
  if (includeHeader) {
    output += '### 📊 Summary\n\n';
  }

  // Empty check
  if (metrics.totalFiles === 0) {
    output += '**No files to analyze**\n\n';
    return output;
  }

  // Basic metrics
  output += `- Total additions: **${formatNumber(metrics.totalAdditions)}**\n`;
  output += `- Files analyzed: **${metrics.filesAnalyzed.length}**\n`;
  output += `- Files excluded: **${metrics.filesExcluded.length}**\n`;
  output += `- Binary files skipped: **${metrics.filesSkippedBinary.length}**\n`;

  // Files with errors
  if (metrics.filesWithErrors.length > 0) {
    output += `- Files with errors: **${metrics.filesWithErrors.length}** ⚠️\n`;
  }

  // Timestamp
  output += `- Executed at: ${new Date().toISOString()}\n`;
  output += '\n';

  return output;
}

/**
 * Check if violations exist
 */
function hasViolations(violations: Violations): boolean {
  return (
    violations.largeFiles.length > 0 ||
    violations.exceedsFileLines.length > 0 ||
    violations.exceedsAdditions ||
    violations.exceedsFileCount
  );
}

/**
 * Options for formatViolations
 */
export interface FormatViolationsOptions {
  includeHeader?: boolean;
}

/**
 * Format violations section
 * Displays file size violations, line violations, and PR-level violations
 */
export function formatViolations(violations: Violations, options?: FormatViolationsOptions): string {
  const { includeHeader = true } = options || {};
  const hasViolationsFlag = hasViolations(violations);
  let output = '';

  // No violations - success message
  if (!hasViolationsFlag) {
    output += '**All files are within size limits** ✅\n';
    output += '\n';
    return output;
  }

  // Size summary header
  if (includeHeader) {
    output += '### 📊 Size Summary\n\n';
  }

  // Summary list
  if (violations.largeFiles.length > 0) {
    output += `- **${violations.largeFiles.length}** file(s) exceed size limit\n`;
  }
  if (violations.exceedsFileLines.length > 0) {
    output += `- **${violations.exceedsFileLines.length}** file(s) exceed line limit\n`;
  }
  if (violations.exceedsAdditions) {
    output += '- **Total additions exceed limit**\n';
  }
  if (violations.exceedsFileCount) {
    output += '- **File count exceeds limit**\n';
  }
  output += '\n';

  // Large files detail table
  if (violations.largeFiles.length > 0) {
    output += '### 🚫 Large Files Detected\n\n';
    output += '| File | Size | Limit | Status |\n';
    output += '|------|------|-------|--------|\n';

    for (const violation of violations.largeFiles) {
      const status = violation.severity === 'critical' ? '🚫 Critical' : '⚠️ Warning';
      output += `| ${escapeMarkdown(violation.file)} | ${formatBytes(violation.actualValue)} | ${formatBytes(violation.limit)} | ${status} |\n`;
    }
    output += '\n';
  }

  // Files exceed line limit detail table
  if (violations.exceedsFileLines.length > 0) {
    output += '### ⚠️ Files Exceed Line Limit\n\n';
    output += '| File | Lines | Limit | Status |\n';
    output += '|------|-------|-------|--------|\n';

    for (const violation of violations.exceedsFileLines) {
      const status = violation.severity === 'critical' ? '🚫 Critical' : '⚠️ Warning';
      output += `| ${escapeMarkdown(violation.file)} | ${formatNumber(violation.actualValue)} | ${formatNumber(violation.limit)} | ${status} |\n`;
    }
    output += '\n';
  }

  return output;
}

/**
 * Format file details table
 * Displays file path, size, lines, and changes
 */
export function formatFileDetails(files: FileMetrics[], limit?: number): string {
  if (files.length === 0) {
    return '';
  }

  let output = '';
  output += '### 📈 Top Large Files\n\n';
  output += '| File | Size | Lines | Changes |\n';
  output += '|------|------|-------|----------|\n';

  // Sort by size descending and limit
  const sortedFiles = [...files].sort((a, b) => b.size - a.size);
  const displayFiles = limit ? sortedFiles.slice(0, limit) : sortedFiles;

  for (const file of displayFiles) {
    const changes = `+${formatNumber(file.additions)}/-${formatNumber(file.deletions)}`;
    output += `| ${escapeMarkdown(file.path)} | ${formatBytes(file.size)} | ${formatNumber(file.lines)} | ${changes} |\n`;
  }
  output += '\n';

  return output;
}

/**
 * Escape special markdown characters
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]`|])/g, '\\$1');
}

/**
 * Generate complexity summary for GitHub Actions Summary
 * @param metrics - Complexity metrics
 * @param config - Complexity configuration
 * @param context - Summary context (owner, repo, sha)
 * @returns Markdown formatted complexity summary
 */
export function generateComplexitySummary(
  metrics: ComplexityMetrics,
  config: ComplexityConfig,
  context: SummaryContext,
): string {
  const { maxComplexity, avgComplexity, analyzedFiles } = metrics;
  const { thresholds } = config;
  const { owner, repo, sha } = context;

  let markdown = `## 📊 コード複雑度分析\n\n`;

  // 基本メトリクス
  markdown += `| メトリクス | 値 |\n`;
  markdown += `|-----------|-----|\n`;
  markdown += `| 最大複雑度 | ${formatNumber(maxComplexity)} |\n`;
  markdown += `| 平均複雑度 | ${avgComplexity.toFixed(1)} |\n`;
  markdown += `| 分析ファイル数 | ${formatNumber(analyzedFiles)} |\n\n`;

  // 高複雑度ファイル（閾値超過、上位10件）
  const highComplexityFiles = metrics.files
    .filter(f => f.complexity >= thresholds.medium)
    .sort((a, b) => b.complexity - a.complexity)
    .slice(0, 10);

  if (highComplexityFiles.length > 0) {
    markdown += `### 高複雑度ファイル（上位10件）\n\n`;
    highComplexityFiles.forEach(file => {
      const level = file.complexity >= thresholds.high ? 'high' : 'medium';
      const fileUrl = `https://github.com/${owner}/${repo}/blob/${sha}/${file.path}`;
      markdown += `- [${escapeMarkdown(file.path)}](${fileUrl}): ${file.complexity} (${level})\n`;

      // 関数別複雑度の詳細表示（上位5件）
      if (file.functions.length > 0) {
        // ソート前にコピーしてミューテーション回避
        const topFunctions = [...file.functions].sort((a, b) => b.complexity - a.complexity).slice(0, 5);
        markdown += `  <details><summary>関数別複雑度（上位5件）</summary>\n\n`;
        topFunctions.forEach(fn => {
          const fnUrl = `https://github.com/${owner}/${repo}/blob/${sha}/${file.path}#L${fn.loc.start}`;
          markdown += `  - [${escapeMarkdown(fn.name)}](${fnUrl}): ${fn.complexity} (L${fn.loc.start}-${fn.loc.end})\n`;
        });
        if (file.functions.length > 5) {
          markdown += `  - *+${file.functions.length - 5}個の関数（表示省略）*\n`;
        }
        markdown += `  </details>\n`;
      }
    });

    const remaining = metrics.files.filter(f => f.complexity >= thresholds.medium).length - 10;
    if (remaining > 0) {
      markdown += `\n*+${remaining}件のファイルが複雑度閾値を超過（表示省略）*\n\n`;
    }
  } else {
    markdown += `✅ すべてのファイルが複雑度閾値以下です（medium閾値: ${thresholds.medium}未満）\n\n`;
  }

  // スキップファイル警告（詳細な理由付き）
  if (metrics.skippedFiles.length > 0) {
    markdown += `### ⚠️ スキップされたファイル\n\n`;
    markdown += `以下のファイルは複雑度計算から除外されました（集計対象外）：\n\n`;
    metrics.skippedFiles.forEach(file => {
      const reasonText: Record<string, string> = {
        too_large: 'ファイルサイズ超過（1MB以上）',
        analysis_failed: 'AST解析失敗',
        timeout: 'タイムアウト',
        binary: 'バイナリファイル',
        encoding_error: 'エンコーディングエラー',
        syntax_error: '構文エラー',
        general: '一般エラー',
      };
      markdown += `- \`${escapeMarkdown(file.path)}\`: ${reasonText[file.reason] || file.reason}`;
      if (file.details) {
        markdown += ` - ${escapeMarkdown(file.details)}`;
      }
      markdown += `\n`;
    });
    markdown += `\n`;
  }

  // 構文エラーファイル警告（集計対象に含まれることを強調）
  if (metrics.syntaxErrorFiles.length > 0) {
    markdown += `### ⚠️ 構文エラーファイル\n\n`;
    markdown += `以下のファイルは構文エラーのため、**複雑度0として集計対象に含まれています**：\n\n`;
    metrics.syntaxErrorFiles.forEach(filePath => {
      markdown += `- \`${escapeMarkdown(filePath)}\`\n`;
    });
    markdown += `\n> **注意**: 構文エラーは開発者の修正対象であり、PRの品質評価に含まれます。\n\n`;
  }

  // PRファイル数トランケーション警告
  if (metrics.truncated && metrics.totalPRFiles) {
    markdown += `\n### ⚠️ PRファイル数制限\n\n`;
    markdown += `GitHub APIの制限により、PR内の一部ファイルが分析対象外となりました。\n`;
    markdown += `- PR全体のファイル数: ${formatNumber(metrics.totalPRFiles)}\n`;
    markdown += `- 分析対象ファイル数: ${formatNumber(metrics.analyzedFiles)}\n`;
    markdown += `- 未分析ファイル数: ${formatNumber(metrics.totalPRFiles - metrics.analyzedFiles)}\n\n`;
    markdown += `> **注意**: 大規模PRでは、GitHub APIの3000ファイル制限により全ファイルを分析できない場合があります。\n`;
  }

  // tsconfig.json未検出警告
  if (!metrics.hasTsconfig) {
    markdown += `\n### ⚠️ tsconfig.json未検出\n\n`;
    markdown += `tsconfig.jsonが見つからなかったため、既定の設定（ecmaVersion: 'latest', sourceType: 'module'）を使用しました。\n`;
    markdown += `> **注意**: TypeScriptプロジェクトの場合、tsconfig.jsonがあるとより正確な解析が可能です。\n`;
  }

  return markdown;
}
