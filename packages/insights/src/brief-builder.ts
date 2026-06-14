import type { InsightBrief } from '@umetrica/core';

import { loadCubeQuery, readMeasure, type CubeQuery } from './cube-client.js';

const PERIOD_LABEL = 'последние 7 дней';

function changePct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function severityFromChange(absChange: number): 'low' | 'medium' | 'high' {
  if (absChange >= 30) return 'high';
  if (absChange >= 15) return 'medium';
  return 'low';
}

function trendFromChange(change: number): 'up' | 'down' | 'flat' {
  if (Math.abs(change) < 3) return 'flat';
  return change > 0 ? 'up' : 'down';
}

async function loadPeriodMetrics(cubeUrl: string, token: string, dateRange: string) {
  const query: CubeQuery = {
    measures: ['Orders.revenue', 'Orders.count', 'Orders.avgOrder'],
    timeDimensions: [{ dimension: 'Orders.createdAt', dateRange }],
  };

  const result = await loadCubeQuery(cubeUrl, token, query);
  return {
    revenue: readMeasure(result.data, 'Orders.revenue'),
    count: readMeasure(result.data, 'Orders.count'),
    avgOrder: readMeasure(result.data, 'Orders.avgOrder'),
  };
}

async function loadDriversByStatus(
  cubeUrl: string,
  token: string,
  measure: 'Orders.revenue' | 'Orders.count'
) {
  const query: CubeQuery = {
    measures: [measure],
    dimensions: ['Orders.status'],
    timeDimensions: [{ dimension: 'Orders.createdAt', dateRange: 'last 7 days' }],
  };

  const result = await loadCubeQuery(cubeUrl, token, query);
  const total = result.data.reduce((sum, row) => sum + (Number(row[measure]) || 0), 0);

  return result.data
    .map((row) => {
      const value = Number(row[measure]) || 0;
      const status = String(row['Orders.status'] ?? 'unknown');
      return {
        dimension: 'Orders.status',
        name: status,
        contributionPct: total > 0 ? (value / total) * 100 : 0,
        value,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map(({ dimension, name, contributionPct }) => ({
      dimension,
      name,
      contributionPct: Math.round(contributionPct * 10) / 10,
    }));
}

export interface BuildBriefOptions {
  cubeUrl: string;
  token: string;
  minChangePct?: number;
}

interface MetricPeriodSnapshot {
  revenue: number;
  count: number;
  avgOrder: number;
}

function buildBriefFromMetricChange(
  metric: string,
  change: number,
  current: MetricPeriodSnapshot,
  previous: MetricPeriodSnapshot,
  drivers: InsightBrief['drivers']
): InsightBrief {
  const countChange = changePct(current.count, previous.count);
  const avgOrderChange = changePct(current.avgOrder, previous.avgOrder);

  return {
    anomaly: {
      metric,
      changePct: Math.round(change * 10) / 10,
      period: PERIOD_LABEL,
      direction: change >= 0 ? 'up' : 'down',
      severity: severityFromChange(Math.abs(change)),
    },
    drivers,
    correlations: [
      {
        metric: 'Orders.count',
        changePct: Math.round(countChange * 10) / 10,
        trend: trendFromChange(countChange),
      },
      {
        metric: 'Orders.avgOrder',
        changePct: Math.round(avgOrderChange * 10) / 10,
        value: Math.round(current.avgOrder * 100) / 100,
        trend: trendFromChange(avgOrderChange),
      },
    ],
    dataQuality: {
      completeness: current.count > 0 ? 1 : 0.5,
      lastSync: new Date().toISOString(),
    },
  };
}

export async function buildRevenueBrief(
  options: BuildBriefOptions
): Promise<InsightBrief | null> {
  const { cubeUrl, token, minChangePct = 5 } = options;

  const [current, previous] = await Promise.all([
    loadPeriodMetrics(cubeUrl, token, 'last 7 days'),
    loadPeriodMetrics(cubeUrl, token, 'from 14 days ago to 7 days ago'),
  ]);

  const revenueChange = changePct(current.revenue, previous.revenue);
  if (Math.abs(revenueChange) < minChangePct) {
    return null;
  }

  const drivers = await loadDriversByStatus(cubeUrl, token, 'Orders.revenue');
  return buildBriefFromMetricChange('Orders.revenue', revenueChange, current, previous, drivers);
}

export async function buildOrdersCountBrief(
  options: BuildBriefOptions
): Promise<InsightBrief | null> {
  const { cubeUrl, token, minChangePct = 5 } = options;

  const [current, previous] = await Promise.all([
    loadPeriodMetrics(cubeUrl, token, 'last 7 days'),
    loadPeriodMetrics(cubeUrl, token, 'from 14 days ago to 7 days ago'),
  ]);

  const countChange = changePct(current.count, previous.count);
  if (Math.abs(countChange) < minChangePct) {
    return null;
  }

  const drivers = await loadDriversByStatus(cubeUrl, token, 'Orders.count');
  return buildBriefFromMetricChange('Orders.count', countChange, current, previous, drivers);
}

export async function detectAnomalies(options: BuildBriefOptions): Promise<InsightBrief[]> {
  const [revenueBrief, ordersBrief] = await Promise.all([
    buildRevenueBrief(options),
    buildOrdersCountBrief(options),
  ]);

  return [revenueBrief, ordersBrief].filter((brief): brief is InsightBrief => brief !== null);
}
