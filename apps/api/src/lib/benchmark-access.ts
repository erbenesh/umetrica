import {
  canReceiveBenchmarkParticipation,
  hasPersonalDataSource,
} from '@sellerpool/core';

import { getOrgConnectionProfile } from './org-connections-profile.js';
import { getInsightSettings, getPrivacySettings } from './org-metadata.js';

export {
  applyBenchmarkOptInChange,
  canReceiveBenchmarkParticipation,
  isBenchmarkContributor,
} from '@sellerpool/core';

export async function canReceiveBenchmarkInsights(organizationId: string) {
  const [privacy, connections, insightSettings] = await Promise.all([
    getPrivacySettings(organizationId),
    getOrgConnectionProfile(organizationId),
    getInsightSettings(organizationId),
  ]);

  if (!hasPersonalDataSource(connections)) {
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
