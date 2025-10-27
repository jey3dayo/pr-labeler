import { t } from '../../i18n.js';
import type { AnalysisResult } from '../../types/analysis.js';
import { formatNumber } from './common.js';

export interface FormatBasicMetricsOptions {
  includeHeader?: boolean;
  includeTimestamp?: boolean;
}

export function formatBasicMetrics(metrics: AnalysisResult['metrics'], options?: FormatBasicMetricsOptions): string {
  const { includeHeader = true, includeTimestamp = true } = options || {};
  let output = '';

  if (includeHeader) {
    output += `### 📈 ${t('summary', 'basicMetrics.title')}\n\n`;
  }

  if (metrics.totalFiles === 0) {
    output += `**${t('summary', 'fileDetails.noFiles')}**\n\n`;
    return output;
  }

  output += `- ${t('summary', 'basicMetrics.totalAdditions')}: **${formatNumber(metrics.totalAdditions)}**\n`;
  output += `- ${t('summary', 'basicMetrics.excludedAdditions')}: **${formatNumber(metrics.excludedAdditions)}**\n`;
  output += `- ${t('summary', 'basicMetrics.totalFiles')}: **${metrics.filesAnalyzed.length}**\n`;
  output += `- ${t('summary', 'basicMetrics.excludedFiles')}: **${metrics.filesExcluded.length}**\n`;
  output += `- ${t('summary', 'basicMetrics.binaryFilesSkipped')}: **${metrics.filesSkippedBinary.length}**\n`;

  if (metrics.filesWithErrors.length > 0) {
    output += `- ${t('summary', 'basicMetrics.filesWithErrors')}: **${metrics.filesWithErrors.length}** ⚠️\n`;
  }

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
