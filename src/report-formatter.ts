/**
 * Report formatting utilities for GitHub Actions Summary and PR comments
 * Provides common markdown generation functions
 */

import type { Violations } from './errors/index.js';
import type { AnalysisResult, FileMetrics } from './file-metrics';
import { t } from './i18n.js';
import type { ComplexityConfig, ComplexityMetrics } from './labeler-types';
import { formatFileSize, formatNumber as formatNumberWithLocale } from './utils/formatting.js';

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
 * @deprecated Use formatFileSize from utils/formatting.ts instead
 */
export function formatBytes(bytes: number): string {
  return formatFileSize(bytes);
}

/**
 * Format number with thousands separator
 * @deprecated Use formatNumberWithLocale from utils/formatting.ts instead
 */
export function formatNumber(num: number): string {
  return formatNumberWithLocale(num);
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
    output += `### 📊 ${t('summary', 'basicMetrics.title')}\n\n`;
  }

  // Empty check
  if (metrics.totalFiles === 0) {
    output += `**${t('summary', 'fileDetails.noFiles')}**\n\n`;
    return output;
  }

  // Basic metrics
  output += `- ${t('summary', 'basicMetrics.totalAdditions')}: **${formatNumber(metrics.totalAdditions)}**\n`;
  output += `- ${t('summary', 'basicMetrics.totalFiles')}: **${metrics.filesAnalyzed.length}**\n`;
  output += `- ${t('summary', 'basicMetrics.excludedFiles')}: **${metrics.filesExcluded.length}**\n`;
  output += `- ${t('summary', 'basicMetrics.binaryFilesSkipped')}: **${metrics.filesSkippedBinary.length}**\n`;

  // Files with errors
  if (metrics.filesWithErrors.length > 0) {
    output += `- ${t('summary', 'basicMetrics.filesWithErrors')}: **${metrics.filesWithErrors.length}** ⚠️\n`;
  }

  // Timestamp
  output += `- ${t('summary', 'basicMetrics.analysisTime')}: ${new Date().toISOString()}\n`;
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
    output += `**${t('summary', 'violations.allWithinLimits')}** ✅\n`;
    output += '\n';
    return output;
  }

  // Size summary header
  if (includeHeader) {
    output += `### 📊 ${t('summary', 'violations.sizeSummary')}\n\n`;
  }

  // Summary list
  if (violations.largeFiles.length > 0) {
    output += `- **${t('summary', 'violations.filesExceedSize', { count: violations.largeFiles.length })}**\n`;
  }
  if (violations.exceedsFileLines.length > 0) {
    output += `- **${t('summary', 'violations.filesExceedLines', { count: violations.exceedsFileLines.length })}**\n`;
  }
  if (violations.exceedsAdditions) {
    output += `- **${t('summary', 'violations.totalAdditionsExceed')}**\n`;
  }
  if (violations.exceedsFileCount) {
    output += `- **${t('summary', 'violations.fileCountExceed')}**\n`;
  }
  output += '\n';

  // Large files detail table
  if (violations.largeFiles.length > 0) {
    output += `### 🚫 ${t('summary', 'violations.largeFilesDetected')}\n\n`;
    output += `| ${t('summary', 'fileDetails.fileName')} | ${t('summary', 'fileDetails.size')} | ${t('summary', 'fileDetails.limit')} | ${t('summary', 'fileDetails.status')} |\n`;
    output += '|------|------|-------|--------|\n';

    for (const violation of violations.largeFiles) {
      const statusText =
        violation.severity === 'critical'
          ? `🚫 ${t('summary', 'violations.statusCritical')}`
          : `⚠️ ${t('summary', 'violations.statusWarning')}`;
      output += `| ${escapeMarkdown(violation.file)} | ${formatBytes(violation.actualValue)} | ${formatBytes(violation.limit)} | ${statusText} |\n`;
    }
    output += '\n';
  }

  // Files exceed line limit detail table
  if (violations.exceedsFileLines.length > 0) {
    output += `### ⚠️ ${t('summary', 'violations.filesExceedLineLimit')}\n\n`;
    output += `| ${t('summary', 'fileDetails.fileName')} | ${t('summary', 'fileDetails.lines')} | ${t('summary', 'fileDetails.limit')} | ${t('summary', 'fileDetails.status')} |\n`;
    output += '|------|-------|-------|--------|\n';

    for (const violation of violations.exceedsFileLines) {
      const statusText =
        violation.severity === 'critical'
          ? `🚫 ${t('summary', 'violations.statusCritical')}`
          : `⚠️ ${t('summary', 'violations.statusWarning')}`;
      output += `| ${escapeMarkdown(violation.file)} | ${formatNumber(violation.actualValue)} | ${formatNumber(violation.limit)} | ${statusText} |\n`;
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
  output += `### 📈 ${t('summary', 'fileDetails.topLargeFiles')}\n\n`;
  output += `| ${t('summary', 'fileDetails.fileName')} | ${t('summary', 'fileDetails.size')} | ${t('summary', 'fileDetails.lines')} | ${t('summary', 'fileDetails.changes')} |\n`;
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

  let markdown = `## 📊 ${t('summary', 'complexity.title')}\n\n`;

  // 基本メトリクス
  markdown += `| ${t('summary', 'complexity.metrics')} | ${t('summary', 'complexity.value')} |\n`;
  markdown += `|-----------|-----|\n`;
  markdown += `| ${t('summary', 'complexity.maxComplexity')} | ${formatNumber(maxComplexity)} |\n`;
  markdown += `| ${t('summary', 'complexity.avgComplexity')} | ${avgComplexity.toFixed(1)} |\n`;
  markdown += `| ${t('summary', 'complexity.analyzedFiles')} | ${formatNumber(analyzedFiles)} |\n\n`;

  // 高複雑度ファイル（閾値超過、上位10件）
  const highComplexityFiles = metrics.files
    .filter(f => f.complexity >= thresholds.medium)
    .sort((a, b) => b.complexity - a.complexity)
    .slice(0, 10);

  if (highComplexityFiles.length > 0) {
    markdown += `### ${t('summary', 'complexity.highFiles')}\n\n`;
    highComplexityFiles.forEach(file => {
      const level =
        file.complexity >= thresholds.high
          ? t('summary', 'complexity.level.high')
          : t('summary', 'complexity.level.medium');
      const fileUrl = `https://github.com/${owner}/${repo}/blob/${sha}/${file.path}`;
      markdown += `- [${escapeMarkdown(file.path)}](${fileUrl}): ${file.complexity} (${level})\n`;

      // 関数別複雑度の詳細表示（上位5件）
      if (file.functions.length > 0) {
        // ソート前にコピーしてミューテーション回避
        const topFunctions = [...file.functions].sort((a, b) => b.complexity - a.complexity).slice(0, 5);
        markdown += `  <details><summary>${t('summary', 'complexity.functionDetails')}</summary>\n\n`;
        topFunctions.forEach(fn => {
          const fnUrl = `https://github.com/${owner}/${repo}/blob/${sha}/${file.path}#L${fn.loc.start}`;
          markdown += `  - [${escapeMarkdown(fn.name)}](${fnUrl}): ${fn.complexity} (L${fn.loc.start}-${fn.loc.end})\n`;
        });
        if (file.functions.length > 5) {
          markdown += `  - *${t('summary', 'complexity.moreFunctions', { count: file.functions.length - 5 })}*\n`;
        }
        markdown += `  </details>\n`;
      }
    });

    const remaining = metrics.files.filter(f => f.complexity >= thresholds.medium).length - 10;
    if (remaining > 0) {
      markdown += `\n*${t('summary', 'complexity.moreFiles', { count: remaining })}*\n\n`;
    }
  } else {
    markdown += `✅ ${t('summary', 'complexity.allBelowThreshold', { threshold: thresholds.medium })}\n\n`;
  }

  // スキップファイル警告（詳細な理由付き）
  if (metrics.skippedFiles.length > 0) {
    markdown += `### ⚠️ ${t('summary', 'complexity.skippedFiles.title')}\n\n`;
    markdown += `${t('summary', 'complexity.skippedFiles.reason')}\n\n`;
    metrics.skippedFiles.forEach(file => {
      const reasonKey = `complexity.skipReasons.${file.reason}` as const;
      const reasonText = t('summary', reasonKey);
      markdown += `- \`${escapeMarkdown(file.path)}\`: ${reasonText}`;
      if (file.details) {
        markdown += ` - ${escapeMarkdown(file.details)}`;
      }
      markdown += `\n`;
    });
    markdown += `\n`;
  }

  // 構文エラーファイル警告（集計対象に含まれることを強調）
  if (metrics.syntaxErrorFiles.length > 0) {
    markdown += `### ⚠️ ${t('summary', 'complexity.syntaxErrorFiles.title')}\n\n`;
    markdown += `${t('summary', 'complexity.syntaxErrorFiles.reason')}\n\n`;
    metrics.syntaxErrorFiles.forEach(filePath => {
      markdown += `- \`${escapeMarkdown(filePath)}\`\n`;
    });
    markdown += `\n> **${t('summary', 'complexity.syntaxErrorFiles.note')}**\n\n`;
  }

  // PRファイル数トランケーション警告
  if (metrics.truncated && metrics.totalPRFiles) {
    markdown += `\n### ⚠️ ${t('summary', 'complexity.prFilesLimit.title')}\n\n`;
    markdown += `${t('summary', 'complexity.prFilesLimit.reason')}\n`;
    markdown += `- ${t('summary', 'complexity.prFilesLimit.totalFiles')}: ${formatNumber(metrics.totalPRFiles)}\n`;
    markdown += `- ${t('summary', 'complexity.prFilesLimit.analyzedFiles')}: ${formatNumber(metrics.analyzedFiles)}\n`;
    markdown += `- ${t('summary', 'complexity.prFilesLimit.skippedFiles')}: ${formatNumber(metrics.totalPRFiles - metrics.analyzedFiles)}\n\n`;
    markdown += `> **${t('summary', 'complexity.prFilesLimit.note')}**\n`;
  }

  // tsconfig.json未検出警告
  if (!metrics.hasTsconfig) {
    markdown += `\n### ⚠️ ${t('summary', 'complexity.tsconfigNotFound.title')}\n\n`;
    markdown += `${t('summary', 'complexity.tsconfigNotFound.reason')}\n`;
    markdown += `> **${t('summary', 'complexity.tsconfigNotFound.note')}**\n`;
  }

  return markdown;
}

/**
 * Format improvement actions section
 * Displays actionable suggestions when violations exist
 * @param violations - Violation details
 * @returns Markdown formatted improvement actions (empty string if no violations)
 */
export function formatImprovementActions(violations: Violations): string {
  // Only show improvement actions when violations exist
  if (!hasViolations(violations)) {
    return '';
  }

  let output = '';
  output += `### 💡 ${t('summary', 'improvementActions.title')}\n\n`;
  output += `${t('summary', 'improvementActions.intro')}\n\n`;

  // PR splitting strategies
  output += `#### 📦 ${t('summary', 'improvementActions.splitting.title')}\n`;
  output += `- **${t('summary', 'improvementActions.splitting.byFeature')}**\n`;
  output += `- **${t('summary', 'improvementActions.splitting.byFileGroups')}**\n`;
  output += `- **${t('summary', 'improvementActions.splitting.separateRefactoring')}**\n\n`;

  // Large file refactoring
  output += `#### 🔨 ${t('summary', 'improvementActions.refactoring.title')}\n`;
  output += `- ${t('summary', 'improvementActions.refactoring.splitFunctions')}\n`;
  output += `- ${t('summary', 'improvementActions.refactoring.extractCommon')}\n`;
  output += `- ${t('summary', 'improvementActions.refactoring.organizeByLayer')}\n\n`;

  // Generated files and lock files
  output += `#### 📄 ${t('summary', 'improvementActions.generated.title')}\n`;
  output += `- ${t('summary', 'improvementActions.generated.excludeLock')}\n`;
  output += `- ${t('summary', 'improvementActions.generated.manageArtifacts')}\n`;
  output += `- ${t('summary', 'improvementActions.generated.separateGenerated')}\n\n`;

  return output;
}

/**
 * Format best practices section
 * Always displays PR size guidelines and best practices
 * @returns Markdown formatted best practices
 */
export function formatBestPractices(): string {
  let output = '';
  output += `### 📚 ${t('summary', 'bestPractices.title')}\n\n`;

  // Recommended PR size
  output += `#### ${t('summary', 'bestPractices.prSize.title')}\n`;
  output += `- ✅ **${t('summary', 'bestPractices.prSize.recommended')}**\n`;
  output += `  - ${t('summary', 'bestPractices.prSize.recommendedTime')}\n`;
  output += `  - ${t('summary', 'bestPractices.prSize.recommendedBugRate')}\n`;
  output += `- ⚠️ **${t('summary', 'bestPractices.prSize.acceptable')}**\n`;
  output += `  - ${t('summary', 'bestPractices.prSize.acceptableTime')}\n`;
  output += `  - ${t('summary', 'bestPractices.prSize.acceptableAdvice')}\n`;
  output += `- 🚫 **${t('summary', 'bestPractices.prSize.avoid')}**\n`;
  output += `  - ${t('summary', 'bestPractices.prSize.avoidEfficiency')}\n`;
  output += `  - ${t('summary', 'bestPractices.prSize.avoidRisk')}\n\n`;

  // File size guidelines
  output += `#### ${t('summary', 'bestPractices.fileSize.title')}\n`;
  output += `- ${t('summary', 'bestPractices.fileSize.under500')}\n`;
  output += `- ${t('summary', 'bestPractices.fileSize.under300')}\n\n`;

  // Review efficiency tips
  output += `#### ${t('summary', 'bestPractices.reviewTips.title')}\n`;
  output += `- ${t('summary', 'bestPractices.reviewTips.smallerFaster')}\n`;
  output += `- ${t('summary', 'bestPractices.reviewTips.largeMultiple')}\n`;
  output += `- ${t('summary', 'bestPractices.reviewTips.groupRelated')}\n\n`;

  return output;
}
