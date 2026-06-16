import { BENCHMARK_POOL_STALE_DAYS } from '@sellerpool/core';

import { runBenchmarkPoolRefresh } from './benchmark-pool.js';

const TICK_MS = 60 * 60 * 1000;
const MOSCOW_OFFSET_MINUTES = 180;

let running = false;

function toMoscowDate(date: Date) {
  return new Date(date.getTime() + (MOSCOW_OFFSET_MINUTES + date.getTimezoneOffset()) * 60_000);
}

function isNightlyRunDue(lastRunAt: Date | null, now: Date) {
  const moscowNow = toMoscowDate(now);
  if (moscowNow.getHours() !== 3) return false;
  if (!lastRunAt) return true;

  const moscowLast = toMoscowDate(lastRunAt);
  return moscowLast.toDateString() !== moscowNow.toDateString();
}

let lastRunAt: Date | null = null;

async function runScheduledBenchmarkPoolRefresh() {
  if (running) return;

  const now = new Date();
  if (!isNightlyRunDue(lastRunAt, now)) return;

  running = true;

  try {
    await runBenchmarkPoolRefresh();
    lastRunAt = now;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'benchmark pool refresh failed';
    console.warn(`[benchmark-pool-scheduler] ${message}`);
  } finally {
    running = false;
  }
}

export function startBenchmarkPoolScheduler() {
  if (process.env.BENCHMARK_POOL_SCHEDULER_ENABLED === 'false') {
    console.info('[benchmark-pool-scheduler] disabled via BENCHMARK_POOL_SCHEDULER_ENABLED=false');
    return;
  }

  console.info(
    `[benchmark-pool-scheduler] started (tick hourly, MSK daily at 03:00, stale window ${BENCHMARK_POOL_STALE_DAYS}d)`
  );

  void runScheduledBenchmarkPoolRefresh();
  setInterval(() => {
    void runScheduledBenchmarkPoolRefresh();
  }, TICK_MS);
}
