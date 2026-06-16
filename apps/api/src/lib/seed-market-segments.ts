import { randomUUID } from 'node:crypto';

import type { BenchmarkSegmentSnapshot, MarketSegmentSnapshot } from '@umetrica/core';
import { eq } from 'drizzle-orm';

import { marketSegmentSnapshots } from '../db/market-segments.js';
import { db } from '../db/index.js';

const PERIOD_LABEL = 'последние 7 дней';

const MARKET_SNAPSHOTS: MarketSegmentSnapshot[] = [
  {
    category: 'Дом и текстиль',
    metric: 'Market.categoryDemand',
    changePct: 12,
    direction: 'up',
    severity: 'medium',
    period: PERIOD_LABEL,
    driverName: 'Комплекты постельного белья',
    driverContributionPct: 38,
    correlationMetric: 'Market.shelfPrice',
    correlationChangePct: 4,
    participantCount: 124,
    completeness: 0.85,
  },
  {
    category: 'Одежда',
    metric: 'Market.searchVolume',
    changePct: 18,
    direction: 'up',
    severity: 'high',
    period: PERIOD_LABEL,
    driverName: 'Весенние коллекции',
    driverContributionPct: 42,
    correlationMetric: 'Market.promoShare',
    correlationChangePct: 9,
    participantCount: 218,
    completeness: 0.88,
  },
  {
    category: 'Красота и здоровье',
    metric: 'Market.categoryDemand',
    changePct: 8,
    direction: 'up',
    severity: 'low',
    period: PERIOD_LABEL,
    driverName: 'Уход за кожей',
    driverContributionPct: 31,
    correlationMetric: 'Market.avgRating',
    correlationChangePct: 2,
    participantCount: 96,
    completeness: 0.82,
  },
  {
    category: 'Электроника',
    metric: 'Market.categoryDemand',
    changePct: 5,
    direction: 'up',
    severity: 'low',
    period: PERIOD_LABEL,
    driverName: 'Аксессуары TWS',
    driverContributionPct: 28,
    correlationMetric: 'Market.shelfPrice',
    correlationChangePct: 3,
    participantCount: 67,
    completeness: 0.8,
  },
  {
    category: 'Другое',
    metric: 'Market.categoryDemand',
    changePct: 6,
    direction: 'up',
    severity: 'low',
    period: PERIOD_LABEL,
    driverName: 'Сезонный спрос',
    driverContributionPct: 25,
    correlationMetric: 'Market.activeSellers',
    correlationChangePct: 3,
    participantCount: 54,
    completeness: 0.78,
  },
];

const BENCHMARK_SNAPSHOTS: BenchmarkSegmentSnapshot[] = [
  {
    category: 'Дом и текстиль',
    metric: 'Benchmark.shelfPrice',
    changePct: 14,
    direction: 'up',
    severity: 'medium',
    period: PERIOD_LABEL,
    percentileLabel: 'Нижние 15%',
    skuLabel: 'Комплект сатин 1.5 сп',
    yourValue: '4 290 ₽',
    medianValue: '3 760 ₽',
    segmentNote: 'сопоставимые SKU по атрибутам',
    participantCount: 18,
    completeness: 0.9,
  },
  {
    category: 'Одежда',
    metric: 'Benchmark.shelfPrice',
    changePct: 9,
    direction: 'up',
    severity: 'medium',
    period: PERIOD_LABEL,
    percentileLabel: 'Нижние 25%',
    skuLabel: 'Платье миди',
    yourValue: '2 890 ₽',
    medianValue: '2 650 ₽',
    segmentNote: 'похожие карточки в категории',
    participantCount: 24,
    completeness: 0.9,
  },
  {
    category: 'Красота и здоровье',
    metric: 'Benchmark.conversion',
    changePct: -11,
    direction: 'down',
    severity: 'medium',
    period: PERIOD_LABEL,
    percentileLabel: 'Нижние 20%',
    skuLabel: 'Набор ухода',
    yourValue: '1,8%',
    medianValue: '2,4%',
    segmentNote: 'сегмент по обороту и рейтингу',
    participantCount: 14,
    completeness: 0.88,
  },
  {
    category: 'Электроника',
    metric: 'Benchmark.shelfPrice',
    changePct: 6,
    direction: 'up',
    severity: 'low',
    period: PERIOD_LABEL,
    percentileLabel: 'Средний диапазон',
    skuLabel: 'Наушники TWS',
    yourValue: '3 490 ₽',
    medianValue: '3 290 ₽',
    segmentNote: 'сопоставимые модели',
    participantCount: 11,
    completeness: 0.87,
  },
  {
    category: 'Другое',
    metric: 'Benchmark.avgOrder',
    changePct: -8,
    direction: 'down',
    severity: 'low',
    period: PERIOD_LABEL,
    percentileLabel: 'Нижние 30%',
    skuLabel: 'Топ-SKU',
    yourValue: '2 150 ₽',
    medianValue: '2 340 ₽',
    segmentNote: 'сегмент категории',
    participantCount: 12,
    completeness: 0.86,
  },
];

function snapshotId(segmentType: 'market' | 'benchmark', category: string) {
  return `${segmentType}:${category}`;
}

export async function ensureMarketSegmentSnapshots(): Promise<{ seeded: boolean; count: number }> {
  const [existing] = await db
    .select({ id: marketSegmentSnapshots.id })
    .from(marketSegmentSnapshots)
    .limit(1);

  if (existing) {
    return { seeded: false, count: MARKET_SNAPSHOTS.length + BENCHMARK_SNAPSHOTS.length };
  }

  const now = new Date();

  for (const snapshot of MARKET_SNAPSHOTS) {
    await db.insert(marketSegmentSnapshots).values({
      id: snapshotId('market', snapshot.category),
      category: snapshot.category,
      segmentType: 'market',
      payload: snapshot,
      participantCount: snapshot.participantCount,
      updatedAt: now,
    });
  }

  for (const snapshot of BENCHMARK_SNAPSHOTS) {
    await db.insert(marketSegmentSnapshots).values({
      id: snapshotId('benchmark', snapshot.category),
      category: snapshot.category,
      segmentType: 'benchmark',
      payload: snapshot,
      participantCount: snapshot.participantCount,
      updatedAt: now,
    });
  }

  return { seeded: true, count: MARKET_SNAPSHOTS.length + BENCHMARK_SNAPSHOTS.length };
}

export async function refreshMarketSegmentSnapshot(category: string, patch: Partial<MarketSegmentSnapshot>) {
  const id = snapshotId('market', category);
  const [row] = await db
    .select()
    .from(marketSegmentSnapshots)
    .where(eq(marketSegmentSnapshots.id, id))
    .limit(1);

  if (!row) return null;

  const current = row.payload as MarketSegmentSnapshot;
  const next = { ...current, ...patch, category };

  await db
    .update(marketSegmentSnapshots)
    .set({
      payload: next,
      participantCount: next.participantCount,
      updatedAt: new Date(),
    })
    .where(eq(marketSegmentSnapshots.id, id));

  return next;
}

export async function insertMarketSegmentSnapshotForTests(snapshot: MarketSegmentSnapshot) {
  await db.insert(marketSegmentSnapshots).values({
    id: randomUUID(),
    category: snapshot.category,
    segmentType: 'market',
    payload: snapshot,
    participantCount: snapshot.participantCount,
    updatedAt: new Date(),
  });
}
