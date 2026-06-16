import {
  BENCHMARK_OPT_IN_REQUIRES_PERSONAL_SOURCE,
  buildBenchmarkParticipationView,
  buildTrustPolicyView,
  hasPersonalDataSource,
  inferOrgDataMode,
  type BenchmarkParticipationView,
  type OrgDataMode,
  type TrustCapabilities,
  type TrustPolicyView,
} from '@sellerpool/core';

import { resolveBenchmarkParticipants } from './market-aggregates.js';
import { getOrgConnectionProfile } from './org-connections-profile.js';
import { getPrivacySettings } from './org-metadata.js';

export type OrgPolicyContext = {
  connections: Awaited<ReturnType<typeof getOrgConnectionProfile>>;
  privacy: BenchmarkParticipationView;
  trustPolicy: TrustPolicyView;
  dataMode: OrgDataMode;
  capabilities: TrustCapabilities;
};

export async function getOrgPolicyContext(organizationId: string): Promise<OrgPolicyContext> {
  const [connections, settings] = await Promise.all([
    getOrgConnectionProfile(organizationId),
    getPrivacySettings(organizationId),
  ]);

  const benchmarkPoolParticipants = await resolveBenchmarkParticipants(settings.marketCategory);
  const privacy = buildBenchmarkParticipationView(settings, benchmarkPoolParticipants);
  const trustPolicy = buildTrustPolicyView({ privacy, connections });

  return {
    connections,
    privacy,
    trustPolicy,
    dataMode: inferOrgDataMode(connections),
    capabilities: trustPolicy.capabilities,
  };
}

export async function canUsePersonalInsights(organizationId: string): Promise<boolean> {
  const { capabilities } = await getOrgPolicyContext(organizationId);
  return capabilities.personalInsights;
}

export function getBenchmarkOptInBlockReason(
  connections: OrgPolicyContext['connections']
): string | null {
  if (!hasPersonalDataSource(connections)) {
    return BENCHMARK_OPT_IN_REQUIRES_PERSONAL_SOURCE;
  }
  return null;
}
