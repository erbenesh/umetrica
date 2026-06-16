import type { InsightRun } from '@sellerpool/core';

export function formatInsightRunDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function insightRunTypeLabel(run: InsightRun) {
  if (run.trigger === 'scheduled') return 'Автопроверка';
  if (run.triggeredByName) return `Вручную · ${run.triggeredByName}`;
  return 'Вручную';
}

export function insightRunResultLabel(run: InsightRun) {
  if (run.result === 'no_anomalies') {
    return run.message ?? 'Без аномалий';
  }

  if (run.result === 'error') {
    return run.message ?? 'Ошибка';
  }

  const count = run.insightCount;
  if (count === 1) return '1 инсайт';
  if (count >= 2 && count <= 4) return `${count} инсайта`;
  return `${count} инсайтов`;
}

export function formatMonthCredits(credits: number) {
  const month = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(new Date());
  const label = month.charAt(0).toUpperCase() + month.slice(1);
  return `${label}: ${credits} кредитов`;
}
