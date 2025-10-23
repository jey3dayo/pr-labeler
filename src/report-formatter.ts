/**
 * Report formatting utilities for GitHub Actions Summary and PR comments
 * Provides common markdown generation functions
 */

import type { Violations } from './errors/index.js';
import { t } from './i18n.js';
import type { ComplexityConfig, ComplexityMetrics } from './labeler-types';
import type { AnalysisResult, FileMetrics, Metrics } from './types/analysis.js';
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
  includeTimestamp?: boolean;
}

/**
 * Format basic metrics section
 * Displays PR additions, files analyzed, excluded files, and timestamp
 */
export function formatBasicMetrics(metrics: AnalysisResult['metrics'], options?: FormatBasicMetricsOptions): string {
  const { includeHeader = true, includeTimestamp = true } = options || {};
  let output = '';

  // Header
  if (includeHeader) {
    output += `### 📈 ${t('summary', 'basicMetrics.title')}\n\n`;
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
  if (includeTimestamp) {
    // Format: YYYY-MM-DD HH:MM (UTC)
    const now = new Date();
    const dateStr = now
      .toISOString()
      .replace(/T/, ' ')
      .replace(/\.\d{3}Z$/, ' (UTC)');
    output += `- ${t('summary', 'basicMetrics.analysisTime')}: ${dateStr}\n`;
  }
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

  // Summary list only (detailed tables removed - now shown in formatFileAnalysis)
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
 * Format unified file analysis table combining violations and large files
 * Shows file size, lines, changes, and status in a single table
 */
export function formatFileAnalysis(violations: Violations, files: FileMetrics[], limit: number = 10): string {
  if (files.length === 0) {
    return '';
  }

  let output = '';
  output += `### 📊 ${t('summary', 'fileAnalysis.title')}\n\n`;
  output += `| ${t('summary', 'fileDetails.fileName')} | ${t('summary', 'fileDetails.size')} | ${t('summary', 'fileDetails.lines')} | ${t('summary', 'fileDetails.changes')} | ${t('summary', 'fileDetails.status')} |\n`;
  output += '|------|------|-------|----------|----------|\n';

  // Sort by size descending and limit
  const sortedFiles = [...files].sort((a, b) => b.size - a.size);
  const displayFiles = limit ? sortedFiles.slice(0, limit) : sortedFiles;

  // Create violation lookup maps for efficient status checking
  const lineViolationMap = new Map(violations.exceedsFileLines.map(v => [v.file, v]));
  const sizeViolationMap = new Map(violations.largeFiles.map(v => [v.file, v]));

  for (const file of displayFiles) {
    const changes = `+${formatNumber(file.additions)}/-${formatNumber(file.deletions)}`;

    // Determine status
    let status = `✅ ${t('summary', 'fileAnalysis.status.ok')}`;
    const lineViolation = lineViolationMap.get(file.path);
    const sizeViolation = sizeViolationMap.get(file.path);

    if (lineViolation) {
      const icon = lineViolation.severity === 'critical' ? '🚫' : '⚠️';
      status = `${icon} ${t('summary', 'fileAnalysis.status.lineExceed', { limit: formatNumber(lineViolation.limit) })}`;
    } else if (sizeViolation) {
      const icon = sizeViolation.severity === 'critical' ? '🚫' : '⚠️';
      status = `${icon} ${t('summary', 'fileAnalysis.status.sizeExceed', { limit: formatBytes(sizeViolation.limit) })}`;
    }

    output += `| ${escapeMarkdown(file.path)} | ${formatBytes(file.size)} | ${formatNumber(file.lines)} | ${changes} | ${status} |\n`;
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
 * Displays relevant best practices in a collapsible block when violations exist
 * @returns Markdown formatted best practices
 */
export function formatBestPractices(violations: Violations, metrics?: Metrics): string {
  if (!hasViolations(violations)) {
    return '';
  }

  void metrics;

  const sections: string[] = [];

  if (violations.exceedsAdditions) {
    const prSizeGuidelines = [
      `#### ${t('summary', 'bestPractices.prSize.title')}`,
      `- ✅ **${t('summary', 'bestPractices.prSize.recommended')}**`,
      `  - ${t('summary', 'bestPractices.prSize.recommendedTime')}`,
      `  - ${t('summary', 'bestPractices.prSize.recommendedBugRate')}`,
      `- ⚠️ **${t('summary', 'bestPractices.prSize.acceptable')}**`,
      `  - ${t('summary', 'bestPractices.prSize.acceptableTime')}`,
      `  - ${t('summary', 'bestPractices.prSize.acceptableAdvice')}`,
      `- 🚫 **${t('summary', 'bestPractices.prSize.avoid')}**`,
      `  - ${t('summary', 'bestPractices.prSize.avoidEfficiency')}`,
      `  - ${t('summary', 'bestPractices.prSize.avoidRisk')}`,
      '',
    ].join('\n');
    sections.push(prSizeGuidelines);
  }

  if (violations.largeFiles.length > 0 || violations.exceedsFileLines.length > 0) {
    const fileSizeGuidelines = [
      `#### ${t('summary', 'bestPractices.fileSize.title')}`,
      `- ${t('summary', 'bestPractices.fileSize.under500')}`,
      `- ${t('summary', 'bestPractices.fileSize.under300')}`,
      '',
    ].join('\n');
    sections.push(fileSizeGuidelines);
  }

  if (violations.exceedsFileCount) {
    const reviewTips = [
      `#### ${t('summary', 'bestPractices.reviewTips.title')}`,
      `- ${t('summary', 'bestPractices.reviewTips.smallerFaster')}`,
      `- ${t('summary', 'bestPractices.reviewTips.largeMultiple')}`,
      `- ${t('summary', 'bestPractices.reviewTips.groupRelated')}`,
      '',
    ].join('\n');
    sections.push(reviewTips);
  }

  if (sections.length === 0) {
    return '';
  }

  const title = t('summary', 'bestPractices.title');
  const expandHint = t('summary', 'bestPractices.expandHint');

  let output = '<details>\n';
  output += `<summary>📚 ${title} (${expandHint})</summary>\n\n`;
  output += sections.join('\n');
  output += '</details>\n\n';

  return output;
}
