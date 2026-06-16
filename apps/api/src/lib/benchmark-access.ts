import {
  applyBenchmarkOptInChange,
  canReceiveBenchmarkParticipation,
  isBenchmarkPlanAllowed,
} from '@umetrica/core';

import { getInsightSettings, getOrgPlanId, getPrivacySettings } from './org-metadata.js';

export {
  applyBenchmarkOptInChange,
  canReceiveBenchmarkParticipation,
  isBenchmarkContributor,
  isBenchmarkPlanAllowed,
} from '@umetrica/core';

export async function canReceiveBenchmarkInsights(organizationId: string) {
  const [privacy, planId, insightSettings] = await Promise.all([
    getPrivacySettings(organizationId),
    getOrgPlanId(organizationId),
    getInsightSettings(organizationId),
  ]);

  if (!isBenchmarkPlanAllowed(planId)) {
    return false;
  }

  if (!insightSettings.sources.benchmark) {
    return false;
  }

  return canReceiveBenchmarkParticipation(privacy);
}

export async function shouldGenerateBenchmarkInsights(organizationId: string) {
  return canReceiveBenchmarkInsights(organizationId);
}
