import {
  buildBenchmarkBriefFromSnapshot,
  buildBenchmarkFallbackEvaluation,
  BENCHMARK_MIN_PARTICIPANTS,
  toBenchmarkEvaluationMeta,
} from '@sellerpool/insights';
import { canReceiveBenchmarkParticipation, type BenchmarkSegmentSnapshot } from '@sellerpool/core';
import type { Insight } from '@sellerpool/core';
import { and, eq, gte } from 'drizzle-orm';

import { insights } from '../db/insights.js';
import { db } from '../db/index.js';
import {
  countActivePoolContributors,
  resolvePersonalizedBenchmarkSnapshot,
} from './benchmark-pool.js';
import { getBenchmarkSegmentSnapshot, resolveBenchmarkParticipants } from './market-aggregates.js';
import { persistSourceInsight } from './market-insight-generation.js';
import { getPrivacySettings } from './org-metadata.js';

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

async function resolveBenchmarkSnapshotForInsight(input: {
  organizationId: string;
  category: string;
}): Promise<{ snapshot: BenchmarkSegmentSnapshot; participants: number } | null> {
  const poolCount = await countActivePoolContributors(input.category);

  if (poolCount >= BENCHMARK_MIN_PARTICIPANTS) {
    const snapshot = await resolvePersonalizedBenchmarkSnapshot(input.organizationId, input.category);
    if (snapshot) {
      return { snapshot, participants: poolCount };
    }
    return null;
  }

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const seedSnapshot = await getBenchmarkSegmentSnapshot(input.category);
  if (!seedSnapshot) {
    return null;
  }

  const participants = await resolveBenchmarkParticipants(input.category);
  if (participants < BENCHMARK_MIN_PARTICIPANTS) {
    return null;
  }

  return { snapshot: seedSnapshot, participants };
}

export async function generateBenchmarkInsights(input: {
  organizationId: string;
}): Promise<Insight[]> {
  const privacy = await getPrivacySettings(input.organizationId);

  if (!canReceiveBenchmarkParticipation(privacy)) {
    return [];
  }

  const resolved = await resolveBenchmarkSnapshotForInsight({
    organizationId: input.organizationId,
    category: privacy.marketCategory,
  });

  if (!resolved) {
    return [];
  }

  const { snapshot, participants } = resolved;

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
