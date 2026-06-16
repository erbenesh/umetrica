import {
  buildBenchmarkBriefFromSnapshot,
  buildBenchmarkFallbackEvaluation,
  BENCHMARK_MIN_PARTICIPANTS,
  toBenchmarkEvaluationMeta,
} from '@umetrica/insights';
import { canReceiveBenchmarkParticipation } from '@umetrica/core';
import type { Insight } from '@umetrica/core';
import { and, eq, gte } from 'drizzle-orm';

import { insights } from '../db/insights.js';
import { db } from '../db/index.js';
import { isBenchmarkPlanAllowed } from './benchmark-access.js';
import { getBenchmarkSegmentSnapshot, resolveBenchmarkParticipants } from './market-aggregates.js';
import { persistSourceInsight } from './market-insight-generation.js';
import { getOrgPlanId, getPrivacySettings } from './org-metadata.js';

const BENCHMARK_COOLDOWN_MS = 24 * 60 * 60 * 1000;

async function hasRecentBenchmarkInsight(organizationId: string) {
  const since = new Date(Date.now() - BENCHMARK_COOLDOWN_MS);

  const [row] = await db
    .select({ id: insights.id })
    .from(insights)
    .where(
      and(
        eq(insights.organizationId, organizationId),
        eq(insights.source, 'benchmark'),
        gte(insights.createdAt, since)
      )
    )
    .limit(1);

  return Boolean(row);
}

export async function generateBenchmarkInsights(input: {
  organizationId: string;
}): Promise<Insight[]> {
  const [privacy, planId] = await Promise.all([
    getPrivacySettings(input.organizationId),
    getOrgPlanId(input.organizationId),
  ]);

  if (!isBenchmarkPlanAllowed(planId)) {
    return [];
  }

  if (!canReceiveBenchmarkParticipation(privacy)) {
    return [];
  }

  const participants = await resolveBenchmarkParticipants(privacy.marketCategory);
  if (participants < BENCHMARK_MIN_PARTICIPANTS) {
    return [];
  }

  const snapshot = await getBenchmarkSegmentSnapshot(privacy.marketCategory);
  if (!snapshot) {
    return [];
  }

  if (await hasRecentBenchmarkInsight(input.organizationId)) {
    return [];
  }

  const brief = buildBenchmarkBriefFromSnapshot(snapshot, participants);
  const evaluation = buildBenchmarkFallbackEvaluation(
    brief,
    privacy.marketCategory,
    toBenchmarkEvaluationMeta(snapshot, participants)
  );

  const item = await persistSourceInsight({
    organizationId: input.organizationId,
    source: 'benchmark',
    brief,
    evaluation,
    provider: 'benchmark-aggregate',
  });

  return [item];
}
