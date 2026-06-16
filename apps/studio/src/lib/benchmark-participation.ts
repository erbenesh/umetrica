import {
  BENCHMARK_OPT_OUT_COOLDOWN_DAYS,
  BENCHMARK_WARMUP_DAYS,
} from '@umetrica/core';

export function formatParticipationDate(value: string | null | undefined) {
  if (!value) return null;
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export { BENCHMARK_OPT_OUT_COOLDOWN_DAYS, BENCHMARK_WARMUP_DAYS };
