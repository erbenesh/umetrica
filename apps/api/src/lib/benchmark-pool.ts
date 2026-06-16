import { randomUUID } from 'node:crypto';

import {
  BenchmarkSegmentSnapshotSchema,
  PrivacySettingsSchema,
  anomalySeverity,
  avgOrderValue,
  avgOrderValueChangePct,
  benchmarkPercentileLabel,
  formatBenchmarkMoney,
  hasPersonalDataSource,
  isBenchmarkContributor,
  median,
  revenueChangePct,
  type BenchmarkPoolContribution,
  type BenchmarkPoolStats,
  type BenchmarkSegmentSnapshot,
} from '@sellerpool/core';
import { and, eq, gte, lt, sql } from 'drizzle-orm';

import {
  benchmarkPoolContributions,
  ensureBenchmarkPoolTable,
} from '../db/benchmark-pool.js';
import { marketSegmentSnapshots } from '../db/market-segments.js';
import { db } from '../db/index.js';
import { orders } from '../db/orders.js';
import { organization } from '../db/schema.js';
import { getOrgConnectionProfile } from './org-connections-profile.js';
import { getPrivacySettings, parseOrgMetadata } from './org-metadata.js';

const PERIOD_LABEL = 'последние 30 дней';
const BENCHMARK_POOL_STALE_MS = 7 * 24 * 60 * 60 * 1000;

function snapshotId(segmentType: string, category: string) {
  return `${segmentType}:${category}`;
}

function periodBounds(now = new Date()) {
  const currentEnd = now;
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - 30);

  const previousEnd = new Date(currentStart);
  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - 30);

  return { currentStart, currentEnd, previousStart, previousEnd };
}

async function queryTenantOrderStats(
  tenantId: string,
  from: Date,
  to: Date
): Promise<{ revenue: number; orderCount: number }> {
  const [row] = await db
    .select({
      revenue: sql<string>`coalesce(sum(${orders.amount}), 0)`,
      orderCount: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(
      and(eq(orders.tenantId, tenantId), gte(orders.createdAt, from), lt(orders.createdAt, to))
    );

  return {
    revenue: Number(row?.revenue ?? 0),
    orderCount: row?.orderCount ?? 0,
  };
}

function toContributionRow(
  row: typeof benchmarkPoolContributions.$inferSelect
): BenchmarkPoolContribution {
  return {
    organizationId: row.organizationId,
    category: row.category,
    periodLabel: row.periodLabel,
    revenue: Number(row.revenue),
    orderCount: row.orderCount,
    revenuePrev: Number(row.revenuePrev),
    orderCountPrev: row.orderCountPrev,
    collectedAt: row.collectedAt.toISOString(),
  };
}

export async function ensureBenchmarkPoolReady() {
  await ensureBenchmarkPoolTable(db);
}

export async function shouldCollectBenchmarkContribution(
  organizationId: string
): Promise<{ collect: boolean; category?: string }> {
  const [privacy, connections] = await Promise.all([
    getPrivacySettings(organizationId),
    getOrgConnectionProfile(organizationId),
  ]);

  if (!isBenchmarkContributor(privacy)) {
    return { collect: false };
  }

  if (!hasPersonalDataSource(connections)) {
    return { collect: false };
  }

  return { collect: true, category: privacy.marketCategory };
}

export async function collectTenantBenchmarkContribution(
  organizationId: string
): Promise<BenchmarkPoolContribution | null> {
  await ensureBenchmarkPoolReady();

  const eligibility = await shouldCollectBenchmarkContribution(organizationId);
  if (!eligibility.collect || !eligibility.category) {
    return null;
  }

  const { currentStart, currentEnd, previousStart, previousEnd } = periodBounds();
  const [current, previous] = await Promise.all([
    queryTenantOrderStats(organizationId, currentStart, currentEnd),
    queryTenantOrderStats(organizationId, previousStart, previousEnd),
  ]);

  if (current.orderCount === 0 && previous.orderCount === 0) {
    return null;
  }

  const now = new Date();
  const values = {
    id: randomUUID(),
    organizationId,
    category: eligibility.category,
    periodLabel: PERIOD_LABEL,
    revenue: String(current.revenue),
    orderCount: current.orderCount,
    revenuePrev: String(previous.revenue),
    orderCountPrev: previous.orderCount,
    collectedAt: now,
  };

  await db
    .insert(benchmarkPoolContributions)
    .values(values)
    .onConflictDoUpdate({
      target: [benchmarkPoolContributions.organizationId, benchmarkPoolContributions.category],
      set: {
        periodLabel: values.periodLabel,
        revenue: values.revenue,
        orderCount: values.orderCount,
        revenuePrev: values.revenuePrev,
        orderCountPrev: values.orderCountPrev,
        collectedAt: values.collectedAt,
      },
    });

  return {
    organizationId,
    category: eligibility.category,
    periodLabel: PERIOD_LABEL,
    revenue: current.revenue,
    orderCount: current.orderCount,
    revenuePrev: previous.revenue,
    orderCountPrev: previous.orderCount,
    collectedAt: now.toISOString(),
  };
}

export async function listBenchmarkContributorOrgIds(): Promise<string[]> {
  const rows = await db.select({ id: organization.id, metadata: organization.metadata }).from(organization);
  const ids: string[] = [];

  for (const row of rows) {
    const metadata = parseOrgMetadata(row.metadata);
    const privacy = PrivacySettingsSchema.safeParse(metadata.privacySettings);
    if (!privacy.success || !isBenchmarkContributor(privacy.data)) continue;
    ids.push(row.id);
  }

  return ids;
}

export async function collectAllBenchmarkContributions(): Promise<{
  scanned: number;
  stored: number;
}> {
  await ensureBenchmarkPoolReady();

  const orgIds = await listBenchmarkContributorOrgIds();
  let stored = 0;

  for (const organizationId of orgIds) {
    try {
      const contribution = await collectTenantBenchmarkContribution(organizationId);
      if (contribution) stored += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'collect failed';
      console.warn(`[benchmark-pool] ${organizationId}: ${message}`);
    }
  }

  return { scanned: orgIds.length, stored };
}

export async function countActivePoolContributors(category: string, now = new Date()): Promise<number> {
  await ensureBenchmarkPoolReady();

  const since = new Date(now.getTime() - BENCHMARK_POOL_STALE_MS);

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(benchmarkPoolContributions)
    .where(
      and(
        eq(benchmarkPoolContributions.category, category),
        gte(benchmarkPoolContributions.collectedAt, since)
      )
    );

  return row?.count ?? 0;
}

export async function getOrgBenchmarkContribution(
  organizationId: string,
  category: string
): Promise<BenchmarkPoolContribution | null> {
  await ensureBenchmarkPoolReady();

  const [row] = await db
    .select()
    .from(benchmarkPoolContributions)
    .where(
      and(
        eq(benchmarkPoolContributions.organizationId, organizationId),
        eq(benchmarkPoolContributions.category, category)
      )
    )
    .limit(1);

  return row ? toContributionRow(row) : null;
}

export async function getBenchmarkPoolStats(category: string, now = new Date()): Promise<BenchmarkPoolStats | null> {
  await ensureBenchmarkPoolReady();

  const since = new Date(now.getTime() - BENCHMARK_POOL_STALE_MS);

  const rows = await db
    .select()
    .from(benchmarkPoolContributions)
    .where(
      and(
        eq(benchmarkPoolContributions.category, category),
        gte(benchmarkPoolContributions.collectedAt, since)
      )
    );

  if (rows.length === 0) return null;

  const avgOrderValues = rows
    .map((row) => avgOrderValue(Number(row.revenue), row.orderCount))
    .filter((value) => value > 0);

  const revenueChanges = rows.map((row) =>
    revenueChangePct(Number(row.revenue), Number(row.revenuePrev))
  );

  return {
    category,
    participantCount: rows.length,
    medianAvgOrderValue: median(avgOrderValues),
    avgOrderValues,
    medianRevenueChangePct: median(revenueChanges),
  };
}

export function buildPersonalizedBenchmarkSnapshot(input: {
  contribution: BenchmarkPoolContribution;
  pool: BenchmarkPoolStats;
}): BenchmarkSegmentSnapshot {
  const { contribution, pool } = input;
  const yourAvg = avgOrderValue(contribution.revenue, contribution.orderCount);
  const changePct = avgOrderValueChangePct(
    contribution.revenue,
    contribution.orderCount,
    contribution.revenuePrev,
    contribution.orderCountPrev
  );

  const direction = changePct >= 0 ? 'up' : 'down';

  return BenchmarkSegmentSnapshotSchema.parse({
    category: contribution.category,
    metric: 'Benchmark.avgOrderValue',
    changePct,
    direction,
    severity: anomalySeverity(changePct),
    period: contribution.periodLabel,
    percentileLabel: benchmarkPercentileLabel(yourAvg, pool.avgOrderValues),
    skuLabel: 'Средний чек',
    yourValue: formatBenchmarkMoney(yourAvg),
    medianValue: formatBenchmarkMoney(pool.medianAvgOrderValue),
    segmentNote: 'обезличенные агрегаты участников пула',
    participantCount: pool.participantCount,
    completeness: Math.min(1, pool.participantCount / 20),
  });
}

export function buildCategoryBenchmarkSnapshot(
  category: string,
  pool: BenchmarkPoolStats
): BenchmarkSegmentSnapshot {
  const changePct = pool.medianRevenueChangePct;
  const direction = changePct >= 0 ? 'up' : 'down';

  return BenchmarkSegmentSnapshotSchema.parse({
    category,
    metric: 'Benchmark.avgOrderValue',
    changePct,
    direction,
    severity: anomalySeverity(changePct),
    period: PERIOD_LABEL,
    percentileLabel: 'Медиана сегмента',
    skuLabel: 'Средний чек',
    yourValue: formatBenchmarkMoney(pool.medianAvgOrderValue),
    medianValue: formatBenchmarkMoney(pool.medianAvgOrderValue),
    segmentNote: 'сводка по обезличенным агрегатам пула',
    participantCount: pool.participantCount,
    completeness: Math.min(1, pool.participantCount / 20),
  });
}

export async function refreshBenchmarkSegmentSnapshot(category: string): Promise<boolean> {
  const pool = await getBenchmarkPoolStats(category);
  if (!pool || pool.participantCount === 0) {
    return false;
  }

  const snapshot = buildCategoryBenchmarkSnapshot(category, pool);
  const now = new Date();

  await db
    .insert(marketSegmentSnapshots)
    .values({
      id: snapshotId('benchmark', category),
      category,
      segmentType: 'benchmark',
      payload: snapshot,
      participantCount: pool.participantCount,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [marketSegmentSnapshots.category, marketSegmentSnapshots.segmentType],
      set: {
        payload: snapshot,
        participantCount: pool.participantCount,
        updatedAt: now,
      },
    });

  return true;
}

export async function refreshAllBenchmarkSegmentSnapshots(): Promise<{
  categories: number;
  updated: number;
}> {
  await ensureBenchmarkPoolReady();

  const rows = await db
    .selectDistinct({ category: benchmarkPoolContributions.category })
    .from(benchmarkPoolContributions);

  let updated = 0;

  for (const row of rows) {
    const ok = await refreshBenchmarkSegmentSnapshot(row.category);
    if (ok) updated += 1;
  }

  return { categories: rows.length, updated };
}

export async function runBenchmarkPoolRefresh(): Promise<{
  contributions: { scanned: number; stored: number };
  snapshots: { categories: number; updated: number };
}> {
  const contributions = await collectAllBenchmarkContributions();
  const snapshots = await refreshAllBenchmarkSegmentSnapshots();

  console.info(
    `[benchmark-pool] collected ${contributions.stored}/${contributions.scanned} orgs, updated ${snapshots.updated}/${snapshots.categories} categories`
  );

  return { contributions, snapshots };
}

export function queueBenchmarkContributionCollect(organizationId: string) {
  void (async () => {
    const contribution = await collectTenantBenchmarkContribution(organizationId);
    if (!contribution) return;
    await refreshBenchmarkSegmentSnapshot(contribution.category);
  })().catch((error) => {
    const message = error instanceof Error ? error.message : 'queued collect failed';
    console.warn(`[benchmark-pool] ${organizationId}: ${message}`);
  });
}

export async function resolvePersonalizedBenchmarkSnapshot(
  organizationId: string,
  category: string
): Promise<BenchmarkSegmentSnapshot | null> {
  const [contribution, pool] = await Promise.all([
    getOrgBenchmarkContribution(organizationId, category),
    getBenchmarkPoolStats(category),
  ]);

  if (!pool || pool.participantCount === 0) {
    return null;
  }

  if (contribution) {
    return buildPersonalizedBenchmarkSnapshot({ contribution, pool });
  }

  return buildCategoryBenchmarkSnapshot(category, pool);
}
