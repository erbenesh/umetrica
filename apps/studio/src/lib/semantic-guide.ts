import type { SemanticCubeEditorTab } from '@/components/semantic/semantic-cube-editor-header';

export const SEMANTIC_LIST_TITLE = 'Модель данных';
export const SEMANTIC_LIST_LEAD =
  'Настройте, какие цифры и разрезы доступны в дашбордах. Куб можно создать из таблицы автоматически — переименуйте поля под свой бизнес и опубликуйте.';

export const SEMANTIC_LIST_INTRO =
  'Куб — это набор показателей (выручка, заказы) и разрезов (дата, статус) для графиков. Без публикации виджеты не увидят ваши правки.';

export const SEMANTIC_CUBE_TAB_HINTS: Record<SemanticCubeEditorTab, string> = {
  visual:
    'Показатели и разрезы — то, что видно в графиках и таблицах. Нажмите на карточку и задайте понятные названия.',
  relationships:
    'Нужно, если цифры лежат в разных таблицах. Например, заказы связать с товарами — тогда в одном отчёте будут и заказ, и название товара.',
  segments:
    'Готовые фильтры вроде «только оплаченные» или «только B2B». На старте обычно не нужны — хватит фильтров в дашборде.',
  hierarchies:
    'Уровни вложенности: год → квартал → месяц. Для сложной аналитики, не обязательно в начале.',
  rollups:
    'Заранее посчитанная сводка: Cube один раз суммирует показатели по выбранным разрезам и сохраняет результат. Дашборд читает готовую таблицу, а не пересчитывает миллионы строк при каждом открытии.',
  yaml: 'Текстовый режим для опытных пользователей. Для обычной настройки достаточно вкладки «Поля».',
};

export const SEMANTIC_CUBE_ADVANCED_TABS: SemanticCubeEditorTab[] = [
  'segments',
  'hierarchies',
  'rollups',
  'yaml',
];

export const GUIDE_DISMISS_KEY = 'sellerpool-semantic-cube-guide-dismissed';

export function readSemanticCubeOnboardingSeen(): boolean {
  try {
    return localStorage.getItem(GUIDE_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function markSemanticCubeOnboardingSeen() {
  try {
    localStorage.setItem(GUIDE_DISMISS_KEY, '1');
  } catch {
    /* ignore */
  }
}
