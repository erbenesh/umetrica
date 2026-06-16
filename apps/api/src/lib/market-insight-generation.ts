import { randomUUID } from 'node:crypto';

import {
  InsightBriefSchema,
  InsightEvaluationSchema,
  InsightSourceSchema,
  MARKET_MIN_PARTICIPANTS,
  type Insight,
  type InsightBrief,
  type InsightEvaluation,
  type InsightSource,
} from '@sellerpool/core';
import {
  buildMarketBriefFromSnapshot,
  buildMarketFallbackEvaluation,
} from '@sellerpool/insights';
import { and, eq, gte } from 'drizzle-orm';

import { insights } from '../db/insights.js';
import { db } from '../db/index.js';
import { getMarketSegmentSnapshot } from './market-aggregates.js';
import { getPrivacySettings } from './org-metadata.js';

const MARKET_COOLDOWN_MS = 24 * 60 * 60 * 1000;

async function hasRecentSourceInsight(organizationId: string, source: InsightSource) {
  const since = new Date(Date.now() - MARKET_COOLDOWN_MS);

  const [row] = await db
    .select({ id: insights.id })
    .from(insights)
    .where(
      and(
        eq(insights.organizationId, organizationId),
        eq(insights.source, source),
        gte(insights.createdAt, since)
      )
    )
    .limit(1);

  return Boolean(row);
}

export async function persistSourceInsight(input: {
  organizationId: string;
  source: InsightSource;
  brief: InsightBrief;
  evaluation: InsightEvaluation;
  provider: string;
}): Promise<Insight> {
  const id = randomUUID();
  const now = new Date();

  const [row] = await db
    .insert(insights)
    .values({
      id,
      organizationId: input.organizationId,
      source: input.source,
      brief: input.brief,
      evaluation: input.evaluation,
      provider: input.provider,
      createdAt: now,
    })
    .returning();

  return toInsightRow(row!);
}

export async function generateMarketInsights(input: {
  organizationId: string;
}): Promise<Insight[]> {
  const privacy = await getPrivacySettings(input.organizationId);
  const snapshot = await getMarketSegmentSnapshot(privacy.marketCategory);

  if (!snapshot || snapshot.participantCount < MARKET_MIN_PARTICIPANTS) {
    return [];
  }

  if (await hasRecentSourceInsight(input.organizationId, 'market')) {
    return [];
  }

  const brief = buildMarketBriefFromSnapshot(snapshot);
  const evaluation = buildMarketFallbackEvaluation(brief, privacy.marketCategory);

  const item = await persistSourceInsight({
    organizationId: input.organizationId,
    source: 'market',
    brief,
    evaluation,
    provider: 'market-aggregate',
  });

  return [item];
}

export function parseInsightSource(value: string | null | undefined): InsightSource {
  const parsed = InsightSourceSchema.safeParse(value);
  return parsed.success ? parsed.data : 'tenant';
}

export function toInsightRow(row: typeof insights.$inferSelect): Insight {
  return {
    id: row.id,
    organizationId: row.organizationId,
    source: parseInsightSource(row.source),
    brief: InsightBriefSchema.parse(row.brief),
    evaluation: InsightEvaluationSchema.parse(row.evaluation),
    provider: row.provider ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function persistTenantInsight(input: {
  organizationId: string;
  brief: InsightBrief;
  evaluation: ReturnType<typeof InsightEvaluationSchema.parse>;
  provider: string;
}): Promise<Insight> {
  return persistSourceInsight({
    organizationId: input.organizationId,
    source: 'tenant',
    brief: input.brief,
    evaluation: input.evaluation,
    provider: input.provider,
  });
}
