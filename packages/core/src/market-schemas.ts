import { z } from 'zod';

export const MARKET_MIN_PARTICIPANTS = 50;

export const MarketSegmentSnapshotSchema = z.object({
  category: z.string(),
  metric: z.string(),
  changePct: z.number(),
  direction: z.enum(['up', 'down']),
  severity: z.enum(['low', 'medium', 'high']),
  period: z.string(),
  driverName: z.string(),
  driverContributionPct: z.number(),
  correlationMetric: z.string(),
  correlationChangePct: z.number(),
  participantCount: z.number().int().positive(),
  completeness: z.number().min(0).max(1),
});

export type MarketSegmentSnapshot = z.infer<typeof MarketSegmentSnapshotSchema>;

export const BenchmarkSegmentSnapshotSchema = z.object({
  category: z.string(),
  metric: z.string(),
  changePct: z.number(),
  direction: z.enum(['up', 'down']),
  severity: z.enum(['low', 'medium', 'high']),
  period: z.string(),
  percentileLabel: z.string(),
  skuLabel: z.string(),
  yourValue: z.string(),
  medianValue: z.string(),
  segmentNote: z.string(),
  participantCount: z.number().int().nonnegative(),
  completeness: z.number().min(0).max(1),
});

export type BenchmarkSegmentSnapshot = z.infer<typeof BenchmarkSegmentSnapshotSchema>;
