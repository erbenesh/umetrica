import { randomUUID } from 'node:crypto';
import { InsightBriefSchema, InsightEvaluationSchema, InsightSourceSchema, } from '@umetrica/core';
import { buildMarketFallbackEvaluation, detectMarketSignals, } from '@umetrica/insights';
import { and, eq, gte } from 'drizzle-orm';
import { insights } from '../db/insights.js';
import { db } from '../db/index.js';
import { getPrivacySettings } from './org-metadata.js';
const MARKET_COOLDOWN_MS = 24 * 60 * 60 * 1000;
async function hasRecentMarketInsight(organizationId) {
    const since = new Date(Date.now() - MARKET_COOLDOWN_MS);
    const [row] = await db
        .select({ id: insights.id })
        .from(insights)
        .where(and(eq(insights.organizationId, organizationId), eq(insights.source, 'market'), gte(insights.createdAt, since)))
        .limit(1);
    return Boolean(row);
}
export async function generateMarketInsights(input) {
    const privacy = await getPrivacySettings(input.organizationId);
    const briefs = detectMarketSignals(privacy.marketCategory);
    if (briefs.length === 0) {
        return [];
    }
    if (await hasRecentMarketInsight(input.organizationId)) {
        return [];
    }
    const now = new Date();
    const items = [];
    for (const brief of briefs.slice(0, 1)) {
        const evaluation = buildMarketFallbackEvaluation(brief, privacy.marketCategory);
        const id = randomUUID();
        const [row] = await db
            .insert(insights)
            .values({
            id,
            organizationId: input.organizationId,
            source: 'market',
            brief,
            evaluation,
            provider: 'market-aggregate',
            createdAt: now,
        })
            .returning();
        items.push({
            id: row.id,
            organizationId: row.organizationId,
            source: InsightSourceSchema.parse(row.source),
            brief: InsightBriefSchema.parse(row.brief),
            evaluation: InsightEvaluationSchema.parse(row.evaluation),
            provider: row.provider ?? undefined,
            createdAt: row.createdAt.toISOString(),
        });
    }
    return items;
}
export function parseInsightSource(value) {
    const parsed = InsightSourceSchema.safeParse(value);
    return parsed.success ? parsed.data : 'tenant';
}
export function toInsightRow(row) {
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
export async function persistTenantInsight(input) {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db
        .insert(insights)
        .values({
        id,
        organizationId: input.organizationId,
        source: 'tenant',
        brief: input.brief,
        evaluation: input.evaluation,
        provider: input.provider,
        createdAt: now,
    })
        .returning();
    return toInsightRow(row);
}
