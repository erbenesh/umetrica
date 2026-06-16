import type { BenchmarkSegmentSnapshot, InsightBrief } from '@sellerpool/core';
import { BENCHMARK_MIN_POOL_PARTICIPANTS } from '@sellerpool/core';

export const BENCHMARK_MIN_PARTICIPANTS = BENCHMARK_MIN_POOL_PARTICIPANTS;

export type BenchmarkEvaluationMeta = {
  metric: string;
  percentileLabel: string;
  skuLabel: string;
  yourValue: string;
  medianValue: string;
  segmentNote: string;
  participants: number;
};

export function buildBenchmarkBriefFromSnapshot(
  snapshot: BenchmarkSegmentSnapshot,
  participants: number
): InsightBrief {
  return {
    anomaly: {
      metric: snapshot.metric,
      changePct: snapshot.changePct,
      period: snapshot.period,
      direction: snapshot.direction,
      severity: snapshot.severity,
    },
    drivers: [
      {
        dimension: 'Benchmark.segment',
        name: `${snapshot.percentileLabel} · ${participants} селлеров`,
        contributionPct: 100,
      },
      {
        dimension: 'Benchmark.sku',
        name: snapshot.skuLabel,
        contributionPct: 0,
      },
    ],
    correlations: [
      {
        metric: 'Benchmark.yourValue',
        value: 0,
        trend: 'flat',
      },
      {
        metric: 'Benchmark.medianValue',
        value: 0,
        trend: 'flat',
      },
    ],
    dataQuality: {
      completeness: snapshot.completeness,
      lastSync: new Date().toISOString(),
    },
  };
}

export function toBenchmarkEvaluationMeta(
  snapshot: BenchmarkSegmentSnapshot,
  participants: number
): BenchmarkEvaluationMeta {
  return {
    metric: snapshot.metric,
    percentileLabel: snapshot.percentileLabel,
    skuLabel: snapshot.skuLabel,
    yourValue: snapshot.yourValue,
    medianValue: snapshot.medianValue,
    segmentNote: snapshot.segmentNote,
    participants,
  };
}

/** @deprecated Use buildBenchmarkBriefFromSnapshot with DB snapshot */
export function getSegmentParticipantCount(_category: string) {
  return 0;
}

/** @deprecated Use buildBenchmarkBriefFromSnapshot with DB snapshot */
export function detectBenchmarkSignals(_category: string): InsightBrief[] {
  return [];
}

/** @deprecated Use toBenchmarkEvaluationMeta */
export function getBenchmarkSignalMeta(_category: string) {
  return null;
}
