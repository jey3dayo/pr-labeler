import type { Violations } from '../../errors/index.js';
import { t } from '../../i18n.js';
import type { Metrics } from '../../types/analysis.js';
import { hasViolations } from './violations.js';

export function formatBestPractices(violations: Violations, metrics?: Metrics): string {
  void metrics;

  if (!hasViolations(violations)) {
    return '';
  }

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
  const expandHint = title === 'Best Practices' ? 'Click to expand' : 'クリックして展開';

  let output = '<details>\n';
  output += `<summary>📚 ${title} (${expandHint})</summary>\n\n`;
  output += sections.join('\n');
  output += '</details>\n\n';

  return output;
}
