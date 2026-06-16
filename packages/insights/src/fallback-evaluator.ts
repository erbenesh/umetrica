import type { InsightBrief, InsightEvaluation } from '@sellerpool/core';

export function buildFallbackEvaluation(brief: InsightBrief): InsightEvaluation {
  const { anomaly, drivers, correlations } = brief;
  const directionLabel = anomaly.direction === 'up' ? 'выросла' : 'снизилась';
  const topDriver = drivers[0];

  const countCorrelation = correlations.find((item) => item.metric === 'Orders.count');
  const avgCorrelation = correlations.find((item) => item.metric === 'Orders.avgOrder');

  const hypotheses = [
    {
      cause:
        countCorrelation && Math.abs(countCorrelation.changePct ?? 0) >= 10
          ? `Изменение числа заказов (${countCorrelation.changePct}%) повлияло на выручку`
          : 'Изменение выручки не объясняется только количеством заказов',
      confidence: 0.55,
    },
    {
      cause:
        avgCorrelation && Math.abs(avgCorrelation.changePct ?? 0) >= 10
          ? `Средний чек изменился на ${avgCorrelation.changePct}%`
          : 'Средний чек остался относительно стабильным',
      confidence: 0.5,
    },
  ];

  if (topDriver) {
    hypotheses.push({
      cause: `Статус «${topDriver.name}» даёт ${topDriver.contributionPct}% выручки за период`,
      confidence: 0.45,
    });
  }

  const recommendations =
    anomaly.direction === 'down'
      ? [
          'Проверьте воронку по статусам заказов и долю отмен',
          'Сравните средний чек с предыдущим периодом',
          'Запустите акцию для восстановления объёма заказов',
        ]
      : [
          'Закрепите рост: проанализируйте топ-статусы по выручке',
          'Проверьте, не вызван ли рост разовым всплеском крупных заказов',
          'Масштабируйте каналы, которые дали прирост заказов',
        ];

  return {
    summary: `Выручка ${directionLabel} на ${Math.abs(anomaly.changePct)}% за ${anomaly.period}.`,
    whatHappened: `Метрика ${anomaly.metric} изменилась с уровнем ${anomaly.severity}. ${
      topDriver
        ? `Основной вклад даёт статус «${topDriver.name}» (${topDriver.contributionPct}%).`
        : 'Структура по статусам пока не выделена.'
    }`,
    hypotheses,
    recommendations,
    confidence: brief.dataQuality.completeness < 1 ? 0.45 : 0.6,
  };
}
