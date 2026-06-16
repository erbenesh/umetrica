import {
  BenchmarkSegmentSnapshotSchema,
  MarketSegmentSnapshotSchema,
  PrivacySettingsSchema,
  type BenchmarkSegmentSnapshot,
  type MarketSegmentSnapshot,
} from '@umetrica/core';
import { and, eq } from 'drizzle-orm';

import { marketSegmentSnapshots } from '../db/market-segments.js';
import { db } from '../db/index.js';
import { organization } from '../db/schema.js';
import { isBenchmarkContributor } from './benchmark-access.js';
import { parseOrgMetadata } from './org-metadata.js';
export { MARKET_MIN_PARTICIPANTS } from '@umetrica/core';
export async function getMarketSegmentSnapshot(
  category: string
): Promise<MarketSegmentSnapshot | null> {
  const [row] = await db
    .select()
    .from(marketSegmentSnapshots)
    .where(
      and(
        eq(marketSegmentSnapshots.category, category),
        eq(marketSegmentSnapshots.segmentType, 'market')
      )
    )
    .limit(1);

  if (!row) {
    const [fallback] = await db
      .select()
      .from(marketSegmentSnapshots)
      .where(
        and(
          eq(marketSegmentSnapshots.category, 'Дом и текстиль'),
          eq(marketSegmentSnapshots.segmentType, 'market')
        )
      )
      .limit(1);

    if (!fallback) return null;
    const parsed = MarketSegmentSnapshotSchema.safeParse(fallback.payload);
    return parsed.success ? { ...parsed.data, category } : null;
  }

  const parsed = MarketSegmentSnapshotSchema.safeParse(row.payload);
  return parsed.success ? parsed.data : null;
}

export async function getBenchmarkSegmentSnapshot(
  category: string
): Promise<BenchmarkSegmentSnapshot | null> {
  const [row] = await db
    .select()
    .from(marketSegmentSnapshots)
    .where(
      and(
        eq(marketSegmentSnapshots.category, category),
        eq(marketSegmentSnapshots.segmentType, 'benchmark')
      )
    )
    .limit(1);

  if (!row) {
    const [fallback] = await db
      .select()
      .from(marketSegmentSnapshots)
      .where(
        and(
          eq(marketSegmentSnapshots.category, 'Дом и текстиль'),
          eq(marketSegmentSnapshots.segmentType, 'benchmark')
        )
      )
      .limit(1);

    if (!fallback) return null;
    const parsed = BenchmarkSegmentSnapshotSchema.safeParse(fallback.payload);
    return parsed.success ? { ...parsed.data, category } : null;
  }

  const parsed = BenchmarkSegmentSnapshotSchema.safeParse(row.payload);
  return parsed.success ? parsed.data : null;
}

export async function countBenchmarkParticipants(category: string): Promise<number> {
  const rows = await db.select({ metadata: organization.metadata }).from(organization);

  let count = 0;

  for (const row of rows) {
    const metadata = parseOrgMetadata(row.metadata);
    const privacy = PrivacySettingsSchema.safeParse(metadata.privacySettings);

    if (!privacy.success || !isBenchmarkContributor(privacy.data)) {
      continue;
    }

    if (privacy.data.marketCategory === category) {
      count += 1;
    }
  }

  return count;
}

export async function resolveBenchmarkParticipants(category: string): Promise<number> {
  const liveCount = await countBenchmarkParticipants(category);

  if (process.env.NODE_ENV === 'production') {
    return liveCount;
  }

  const snapshot = await getBenchmarkSegmentSnapshot(category);
  const floor = snapshot?.participantCount ?? 0;
  return Math.max(liveCount, floor);
}
