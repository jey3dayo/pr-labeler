import type { Violations } from '../../errors/index.js';
import { t } from '../../i18n.js';
import type { Metrics } from '../../types/analysis.js';
import { hasViolations } from './violations.js';

interface PracticeSection {
  isApplicable: (violations: Violations) => boolean;
  render: () => string;
}

function renderList(titleKey: string, lines: string[]): string {
  return [`#### ${t('summary', titleKey)}`, ...lines, ''].join('\n');
}

const PRACTICE_SECTIONS: PracticeSection[] = [
  {
    isApplicable: violations => violations.exceedsAdditions,
    render: () =>
      renderList('bestPractices.prSize.title', [
        `- ✅ **${t('summary', 'bestPractices.prSize.recommended')}**`,
        `  - ${t('summary', 'bestPractices.prSize.recommendedTime')}`,
        `  - ${t('summary', 'bestPractices.prSize.recommendedBugRate')}`,
        `- ⚠️ **${t('summary', 'bestPractices.prSize.acceptable')}**`,
        `  - ${t('summary', 'bestPractices.prSize.acceptableTime')}`,
        `  - ${t('summary', 'bestPractices.prSize.acceptableAdvice')}`,
        `- 🚫 **${t('summary', 'bestPractices.prSize.avoid')}**`,
        `  - ${t('summary', 'bestPractices.prSize.avoidEfficiency')}`,
        `  - ${t('summary', 'bestPractices.prSize.avoidRisk')}`,
      ]),
  },
  {
    isApplicable: violations => violations.largeFiles.length > 0 || violations.exceedsFileLines.length > 0,
    render: () =>
      renderList('bestPractices.fileSize.title', [
        `- ${t('summary', 'bestPractices.fileSize.under500')}`,
        `- ${t('summary', 'bestPractices.fileSize.under300')}`,
      ]),
  },
  {
    isApplicable: violations => violations.exceedsFileCount,
    render: () =>
      renderList('bestPractices.reviewTips.title', [
        `- ${t('summary', 'bestPractices.reviewTips.smallerFaster')}`,
        `- ${t('summary', 'bestPractices.reviewTips.largeMultiple')}`,
        `- ${t('summary', 'bestPractices.reviewTips.groupRelated')}`,
      ]),
  },
];

export function formatBestPractices(violations: Violations, metrics?: Metrics): string {
  void metrics;

  if (!hasViolations(violations)) {
    return '';
  }

  const sections = PRACTICE_SECTIONS.filter(section => section.isApplicable(violations)).map(section =>
    section.render(),
  );

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
