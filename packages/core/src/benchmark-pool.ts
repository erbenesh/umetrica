import { z } from 'zod';

export const BENCHMARK_POOL_STALE_DAYS = 7;

/** Minimum active pool contributors before benchmark insights are shown (k-anonymity). */
export const BENCHMARK_MIN_POOL_PARTICIPANTS = 10;

/** Human-readable list of fields contributed to the benchmark pool — keep in sync with collect logic. */
export const BENCHMARK_POOL_CONTRIBUTION_LABEL =
  'выручка, число заказов и средний чек за 30 дней (и динамика к прошлым 30 дням)';

export function formatBenchmarkPoolThresholdHint(
  category: string,
  participantCount?: number
): string {
  const count = participantCount ?? 0;
  const min = BENCHMARK_MIN_POOL_PARTICIPANTS;

  if (count >= min) {
    return `В категории «${category}» сейчас ${count} участников — порог для бенчмарков (от ${min}) выполнен.`;
  }

  return `В категории «${category}» сейчас ${count} из ${min} участников, нужных для показа бенчмарков.`;
}

export const BenchmarkPoolContributionSchema = z.object({
  organizationId: z.string(),
  category: z.string(),
  periodLabel: z.string(),
  revenue: z.number().nonnegative(),
  orderCount: z.number().int().nonnegative(),
  revenuePrev: z.number().nonnegative(),
  orderCountPrev: z.number().int().nonnegative(),
  collectedAt: z.string().datetime(),
});

export type BenchmarkPoolContribution = z.infer<typeof BenchmarkPoolContributionSchema>;

export const BenchmarkPoolStatsSchema = z.object({
  category: z.string(),
  participantCount: z.number().int().nonnegative(),
  medianAvgOrderValue: z.number().nonnegative(),
  avgOrderValues: z.array(z.number().nonnegative()),
  medianRevenueChangePct: z.number(),
});

export type BenchmarkPoolStats = z.infer<typeof BenchmarkPoolStatsSchema>;

export function avgOrderValue(revenue: number, orderCount: number): number {
  if (orderCount <= 0) return 0;
  return revenue / orderCount;
}

export function revenueChangePct(revenue: number, revenuePrev: number): number {
  if (revenuePrev <= 0) return 0;
  return Math.round(((revenue - revenuePrev) / revenuePrev) * 100);
}

export function avgOrderValueChangePct(
  revenue: number,
  orderCount: number,
  revenuePrev: number,
  orderCountPrev: number
): number {
  const now = avgOrderValue(revenue, orderCount);
  const prev = avgOrderValue(revenuePrev, orderCountPrev);
  if (prev <= 0) return 0;
  return Math.round(((now - prev) / prev) * 100);
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

export function benchmarkPercentileLabel(value: number, values: number[]): string {
  if (values.length === 0) return 'Сегмент';
  const sorted = [...values].sort((a, b) => a - b);
  const below = sorted.filter((item) => item < value).length;
  const pct = Math.round((below / sorted.length) * 100);
  if (pct <= 15) return `Нижние ${Math.max(pct, 5)}%`;
  if (pct >= 85) return `Верхние ${Math.max(100 - pct, 5)}%`;
  if (pct >= 40 && pct <= 60) return 'Около медианы';
  return pct < 50 ? `Ниже медианы (${pct}%)` : `Выше медианы (${pct}%)`;
}

export function anomalySeverity(changePct: number): 'low' | 'medium' | 'high' {
  const abs = Math.abs(changePct);
  if (abs >= 15) return 'high';
  if (abs >= 8) return 'medium';
  return 'low';
}

export function formatBenchmarkMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}
