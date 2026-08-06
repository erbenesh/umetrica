import type { SemanticCubeEditorTab } from '@/components/semantic/semantic-cube-editor-header';

export const SEMANTIC_CUBE_TAB_LABELS: Record<SemanticCubeEditorTab, string> = {
  visual: 'Поля',
  relationships: 'Связи',
  segments: 'Сегменты',
  hierarchies: 'Иерархии',
  rollups: 'Предагрегации',
  yaml: 'YAML',
};

export const JOIN_RELATIONSHIP_LABELS = {
  belongsTo: 'Многие к одному',
  hasMany: 'Один ко многим',
  hasOne: 'Один к одному',
} as const;

export const GRANULARITY_LABELS = {
  day: 'День',
  week: 'Неделя',
  month: 'Месяц',
  year: 'Год',
} as const;

export const DIMENSION_TYPE_LABELS = {
  string: 'Строка',
  time: 'Время',
  number: 'Число',
  boolean: 'Логический',
} as const;

export const MEASURE_AGGREGATION_LABELS = {
  sum: 'Сумма',
  count: 'Количество',
  avg: 'Среднее',
  min: 'Минимум',
  max: 'Максимум',
} as const;

export const MEASURE_FORMAT_LABELS = {
  currency: 'Валюта',
  percent: 'Процент',
  number: 'Число',
} as const;

export const MEMBER_KIND_LABELS = {
  measure: 'показатель',
  dimension: 'разрез',
} as const;

/** Короткие подписи в палитре и кнопках */
export const PALETTE_MEASURE_LABEL = 'Показатель';
export const PALETTE_DIMENSION_LABEL = 'Разрез';

export const REFRESH_EVERY_PRESETS = [
  '',
  '10 second',
  '1 hour',
  '1 day',
  '1 week',
] as const;

export const REFRESH_EVERY_LABELS: Record<string, string> = {
  '': 'По умолчанию Cube',
  '10 second': '10 секунд',
  '1 hour': '1 час',
  '1 day': '1 день',
  '1 week': '1 неделя',
  __custom__: 'Своё значение',
};

export function labelRefreshEvery(value: string) {
  return REFRESH_EVERY_LABELS[value] ?? value;
}

export function labelGranularity(value: string) {
  return GRANULARITY_LABELS[value as keyof typeof GRANULARITY_LABELS] ?? value;
}

export function pluralRu(count: number, one: string, few: string, many: string) {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return many;
  if (n1 > 1 && n1 < 5) return few;
  if (n1 === 1) return one;
  return many;
}

export function formatMeasureCount(count: number) {
  return `${count} ${pluralRu(count, 'показатель', 'показателя', 'показателей')}`;
}

export function formatDimensionCount(count: number) {
  return `${count} ${pluralRu(count, 'разрез', 'разреза', 'разрезов')}`;
}

export function labelMeasureAggregation(type: string) {
  return MEASURE_AGGREGATION_LABELS[type as keyof typeof MEASURE_AGGREGATION_LABELS] ?? type;
}

export function labelMeasureFormat(format: string) {
  return MEASURE_FORMAT_LABELS[format as keyof typeof MEASURE_FORMAT_LABELS] ?? format;
}
