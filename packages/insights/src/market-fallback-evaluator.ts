import type { InsightBrief, InsightEvaluation } from '@umetrica/core';

export function buildMarketFallbackEvaluation(
  brief: InsightBrief,
  category: string
): InsightEvaluation {
  const { anomaly, drivers } = brief;
  const directionLabel = anomaly.direction === 'up' ? 'вырос' : 'снизился';
  const topDriver = drivers[0];

  return {
    summary: `Спрос в категории «${category}» ${directionLabel} на ${Math.abs(anomaly.changePct)}%`,
    whatHappened: `По агрегированным данным WB/Ozon за ${anomaly.period} показатель ${anomaly.metric} изменился на ${anomaly.changePct}%. ${
      topDriver
        ? `Основной вклад: ${topDriver.name} (${topDriver.contributionPct}%).`
        : 'Структура категории остаётся фрагментированной.'
    } Это рыночный сигнал — без доступа к вашему кабинету.`,
    hypotheses: [
      {
        cause: 'Сезонный или промо-эффект на витрине категории',
        confidence: 0.52,
      },
      {
        cause: 'Сдвиг ценовой медианы у конкурентов в сегменте',
        confidence: 0.48,
      },
    ],
    recommendations: [
      'Сравните динамику с вашими продажами за тот же период',
      'Проверьте цены топ-20 SKU в категории на витрине',
      'Если рост устойчив — скорректируйте закупку или промо-план',
    ],
    confidence: 0.55,
  };
}
