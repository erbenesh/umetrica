import type { InsightBrief, InsightEvaluation } from '@sellerpool/core';

import type { BenchmarkEvaluationMeta } from './benchmark-brief-builder.js';

export function buildBenchmarkFallbackEvaluation(
  brief: InsightBrief,
  category: string,
  meta?: BenchmarkEvaluationMeta | null
): InsightEvaluation {
  const signal = meta;
  const participants = meta?.participants ?? 0;
  const { anomaly } = brief;

  const comparisonMetric = signal?.metric.includes('Price')
    ? 'цена на витрине'
    : signal?.metric.includes('conversion')
      ? 'конверсия'
      : 'средний чек';

  const directionLabel =
    anomaly.direction === 'up' && comparisonMetric === 'цена на витрине'
      ? 'выше'
      : anomaly.direction === 'down'
        ? 'ниже'
        : 'отличается от';

  return {
    summary: signal
      ? `${comparisonMetric.charAt(0).toUpperCase() + comparisonMetric.slice(1)} ${directionLabel} медианы сегмента на ${Math.abs(anomaly.changePct)}%`
      : `Отклонение от медианы сегмента на ${Math.abs(anomaly.changePct)}%`,
    whatHappened: signal
      ? `Ваш показатель (${signal.yourValue}) ${directionLabel} медианы сегмента (${signal.medianValue}) на ${Math.abs(anomaly.changePct)}% за ${anomaly.period}. Сегмент: «${category}», ${participants} селлеров с opt-in, ${signal.segmentNote}. Позиция: ${signal.percentileLabel}.`
      : `Показатель ${anomaly.metric} отклоняется от медианы сегмента «${category}» на ${anomaly.changePct}%.`,
    hypotheses: [
      {
        cause: 'Разница в промо-активности конкурентов за последние 7 дней',
        confidence: 0.5,
      },
      {
        cause: 'Отличие контента карточки или рейтинга от медианы сегмента',
        confidence: 0.46,
      },
    ],
    recommendations:
      anomaly.direction === 'up' && comparisonMetric === 'цена на витрине'
        ? [
            'Проверьте акции конкурентов — возможен временный ценовой разрыв',
            'Если маржа позволяет — тест −8% на 2 недели с замером конверсии',
            'При премиум-позиционировании усилите контент карточки вместо снижения цены',
          ]
        : [
            'Сравните воронку с медианой сегмента по ключевым этапам',
            'Проверьте наличие и сроки доставки относительно конкурентов',
            'Обновите медиа и отзывы на карточках с наибольшим трафиком',
          ],
    confidence: participants >= 10 ? 0.58 : 0.4,
  };
}
