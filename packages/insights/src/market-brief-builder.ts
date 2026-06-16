import type { InsightBrief, MarketSegmentSnapshot } from '@umetrica/core';

export function buildMarketBriefFromSnapshot(snapshot: MarketSegmentSnapshot): InsightBrief {  return {
    anomaly: {
      metric: snapshot.metric,
      changePct: snapshot.changePct,
      period: snapshot.period,
      direction: snapshot.direction,
      severity: snapshot.severity,
    },
    drivers: [
      {
        dimension: 'Market.category',
        name: `${snapshot.driverName} · ${snapshot.category}`,
        contributionPct: snapshot.driverContributionPct,
      },
    ],
    correlations: [
      {
        metric: snapshot.correlationMetric,
        changePct: snapshot.correlationChangePct,
        trend: snapshot.correlationChangePct >= 0 ? 'up' : 'down',
      },
    ],
    dataQuality: {
      completeness: snapshot.completeness,
      lastSync: new Date().toISOString(),
    },
  };
}

/** @deprecated Use buildMarketBriefFromSnapshot with DB snapshot */
export function detectMarketSignals(category: string): InsightBrief[] {
  void category;
  return [];
}
