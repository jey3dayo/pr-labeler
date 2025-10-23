import type { Violations } from '../../errors/index.js';
import { t } from '../../i18n.js';
import { hasViolations } from './violations.js';

export function formatImprovementActions(violations: Violations): string {
  if (!hasViolations(violations)) {
    return '';
  }

  let output = '';
  output += `### 💡 ${t('summary', 'improvementActions.title')}\n\n`;
  output += `${t('summary', 'improvementActions.intro')}\n\n`;

  output += `#### 📦 ${t('summary', 'improvementActions.splitting.title')}\n`;
  output += `- **${t('summary', 'improvementActions.splitting.byFeature')}**\n`;
  output += `- **${t('summary', 'improvementActions.splitting.byFileGroups')}**\n`;
  output += `- **${t('summary', 'improvementActions.splitting.separateRefactoring')}**\n\n`;

  output += `#### 🔨 ${t('summary', 'improvementActions.refactoring.title')}\n`;
  output += `- ${t('summary', 'improvementActions.refactoring.splitFunctions')}\n`;
  output += `- ${t('summary', 'improvementActions.refactoring.extractCommon')}\n`;
  output += `- ${t('summary', 'improvementActions.refactoring.organizeByLayer')}\n\n`;

  output += `#### 📄 ${t('summary', 'improvementActions.generated.title')}\n`;
  output += `- ${t('summary', 'improvementActions.generated.excludeLock')}\n`;
  output += `- ${t('summary', 'improvementActions.generated.manageArtifacts')}\n`;
  output += `- ${t('summary', 'improvementActions.generated.separateGenerated')}\n\n`;

  return output;
}
