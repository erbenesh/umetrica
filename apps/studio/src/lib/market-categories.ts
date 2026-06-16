/** Категории маркетплейса — единый список для онбординга, privacy и рыночных инсайтов */
export const MARKET_CATEGORIES = [
  'Дом и текстиль',
  'Одежда',
  'Красота и здоровье',
  'Электроника',
  'Другое',
] as const;

export type MarketCategory = (typeof MARKET_CATEGORIES)[number];

export const DEFAULT_MARKET_CATEGORY: MarketCategory = 'Дом и текстиль';
