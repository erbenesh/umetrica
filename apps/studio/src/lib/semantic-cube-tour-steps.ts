import type { SemanticCubeEditorTab } from '@/components/semantic/semantic-cube-editor-header';
import type { DriveStep, Driver } from 'driver.js';

import { SEMANTIC_CUBE_TAB_HINTS } from '@/lib/semantic-guide';

const TAB_SWITCH_MS = 200;

function pickVisibleTourTarget(selector: string): Element {
  const nodes = document.querySelectorAll(selector);
  for (const node of nodes) {
    if (node instanceof HTMLElement && node.offsetParent !== null) {
      return node;
    }
  }
  const fallback = document.querySelector(selector);
  if (!fallback) {
    throw new Error(`Tour target not found: ${selector}`);
  }
  return fallback;
}

function switchTabThen(
  tab: SemanticCubeEditorTab,
  switchTab: (tab: SemanticCubeEditorTab) => void,
  driverInstance: Driver,
  move: 'next' | 'prev' = 'next'
) {
  switchTab(tab);
  window.setTimeout(() => {
    driverInstance.refresh();
    if (move === 'next') {
      driverInstance.moveNext();
    } else {
      driverInstance.movePrevious();
    }
  }, TAB_SWITCH_MS);
}

export interface SemanticCubeTourRuntime {
  switchTab: (tab: SemanticCubeEditorTab) => void;
  prepare: (stepId: string) => void;
  centerOnTarget?: (selector: string) => Promise<void>;
}

const CANVAS_FOCUS_MS = 120;

async function focusTourTarget(
  selector: string,
  runtime: SemanticCubeTourRuntime,
  driverInstance: Driver
) {
  if (!runtime.centerOnTarget) return;
  await runtime.centerOnTarget(selector);
  window.setTimeout(() => driverInstance.refresh(), CANVAS_FOCUS_MS);
}

function focusThenPrepare(
  selector: string,
  prepareStep: string,
  runtime: SemanticCubeTourRuntime,
  driverInstance: Driver
) {
  void (async () => {
    runtime.prepare(prepareStep);
    await focusTourTarget(selector, runtime, driverInstance);
  })();
}

function focusThenNext(
  selector: string,
  runtime: SemanticCubeTourRuntime,
  driverInstance: Driver
) {
  void (async () => {
    await focusTourTarget(selector, runtime, driverInstance);
    driverInstance.moveNext();
  })();
}

function afterPrepare(prepareStep: string, runtime: SemanticCubeTourRuntime, driverInstance: Driver) {
  runtime.prepare(prepareStep);
  window.setTimeout(() => driverInstance.refresh(), 100);
}

export function buildSemanticCubeTourSteps(runtime: SemanticCubeTourRuntime): DriveStep[] {
  const { switchTab } = runtime;

  const tabNext = (tab: SemanticCubeEditorTab): DriveStep['popover'] => ({
    onNextClick: (_element, _step, { driver: driverInstance }) => {
      switchTabThen(tab, switchTab, driverInstance, 'next');
    },
  });

  return [
    {
      popover: {
        title: 'Редактор куба',
        description:
          'Куб уже собран из таблицы. Пройдём все вкладки: покажем, что где настраивается, и пару примеров правок.',
        align: 'center',
      },
    },
    {
      element: '[data-tour="cube-tabs"]',
      popover: {
        title: 'Вкладки куба',
        description:
          'Каждая вкладка — отдельный тип настроек. Сейчас пройдём их по очереди с переключением и примерами.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="cube-tab-visual"]',
      popover: {
        title: 'Редактор',
        description: SEMANTIC_CUBE_TAB_HINTS.visual,
        side: 'bottom',
        align: 'start',
        ...tabNext('visual'),
      },
    },
    {
      element: '[data-tour="cube-canvas"]',
      onHighlightStarted: (_element, _step, { driver: driverInstance }) =>
        focusThenPrepare('[data-tour="cube-cube"]', 'visual-canvas', runtime, driverInstance),
      popover: {
        title: 'Схема данных',
        description:
          'Зелёная карточка — таблица в базе. Синяя — куб. Оранжевые — показатели, фиолетовые — разрезы. Нажмите карточку, чтобы открыть свойства.',
        side: 'top',
        align: 'center',
        onNextClick: (_element, _step, { driver: driverInstance }) =>
          focusThenNext('[data-tour="cube-measure"]', runtime, driverInstance),
      },
    },
    {
      element: () =>
        document.querySelector('[data-tour="cube-measure"]') ??
        pickVisibleTourTarget('[data-tour="cube-canvas"]'),
      onHighlightStarted: (_element, _step, { driver: driverInstance }) =>
        focusThenPrepare('[data-tour="cube-measure"]', 'visual-measure', runtime, driverInstance),
      popover: {
        title: 'Показатели',
        description:
          'Это цифры для графиков — выручка, количество заказов. Сейчас откроем свойства и переименуем показатель.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: () => pickVisibleTourTarget('[data-tour="cube-inspector-title"]'),
      onHighlightStarted: (_element, _step, { driver: driverInstance }) => {
        void (async () => {
          runtime.prepare('visual-inspector-demo');
          await focusTourTarget('[data-tour="cube-inspector-title"]', runtime, driverInstance);
          window.setTimeout(() => driverInstance.refresh(), CANVAS_FOCUS_MS);
        })();
      },
      popover: {
        title: 'Пример переименования',
        description:
          'Поле «Название в дашборде» — так показатель увидит команда. Мы подставили пример «Выручка (пример)».',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '[data-tour="cube-tab-relationships"]',
      popover: {
        title: 'Связи',
        description: SEMANTIC_CUBE_TAB_HINTS.relationships,
        side: 'bottom',
        align: 'start',
        ...tabNext('relationships'),
      },
    },
    {
      element: () =>
        document.querySelector('[data-tour="cube-relationships-demo"]') ??
        pickVisibleTourTarget('[data-tour="cube-relationships-panel"]'),
      onHighlightStarted: (_element, _step, { driver: driverInstance }) =>
        afterPrepare('relationships-demo', runtime, driverInstance),
      popover: {
        title: 'Настройка связи',
        description:
          'Выберите связанный куб и тип связи. Если в базе есть внешние ключи, SQL подставится автоматически. Ниже — пример связи, если есть второй куб.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="cube-tab-segments"]',
      popover: {
        title: 'Сегменты',
        description: SEMANTIC_CUBE_TAB_HINTS.segments,
        side: 'bottom',
        align: 'start',
        ...tabNext('segments'),
      },
    },
    {
      element: () =>
        document.querySelector('[data-tour="cube-segments-demo"]') ??
        pickVisibleTourTarget('[data-tour="cube-segments-panel"]'),
      onHighlightStarted: (_element, _step, { driver: driverInstance }) =>
        afterPrepare('segments-demo', runtime, driverInstance),
      popover: {
        title: 'Пример сегмента',
        description:
          'Добавили фильтр «Только оплаченные» — status = paid. Такие сегменты можно вызывать в виджетах вместо ручного фильтра.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="cube-tab-hierarchies"]',
      popover: {
        title: 'Иерархии',
        description: SEMANTIC_CUBE_TAB_HINTS.hierarchies,
        side: 'bottom',
        align: 'start',
        ...tabNext('hierarchies'),
      },
    },
    {
      element: () =>
        document.querySelector('[data-tour="cube-hierarchies-demo"]') ??
        pickVisibleTourTarget('[data-tour="cube-hierarchies-panel"]'),
      onHighlightStarted: (_element, _step, { driver: driverInstance }) =>
        afterPrepare('hierarchies-demo', runtime, driverInstance),
      popover: {
        title: 'Пример иерархии',
        description:
          'Уровни идут от общего к частному — например, регион и город. В отчёте можно «проваливаться» глубже.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="cube-tab-rollups"]',
      popover: {
        title: 'Предагрегации',
        description: SEMANTIC_CUBE_TAB_HINTS.rollups,
        side: 'bottom',
        align: 'start',
        ...tabNext('rollups'),
      },
    },
    {
      element: '[data-tour="cube-rollups-panel"]',
      popover: {
        title: 'Что настраивать',
        description:
          'Отметьте показатели и разрезы для сводки — например, выручку по дням и товарам. Cube построит отдельную таблицу с итогами и будет обновлять её по расписанию. Аналогия: готовый отчёт «продажи по месяцам» вместо пересчёта всех чеков при каждом открытии дашборда.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '[data-tour="cube-tab-yaml"]',
      popover: {
        title: 'YAML',
        description: SEMANTIC_CUBE_TAB_HINTS.yaml,
        side: 'bottom',
        align: 'end',
        ...tabNext('yaml'),
      },
    },
    {
      element: '[data-tour="cube-yaml-panel"]',
      popover: {
        title: 'Текстовый режим',
        description:
          'Полная модель куба в YAML. Для повседневной работы достаточно вкладки «Редактор» — сюда заглядывают разработчики.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: () => pickVisibleTourTarget('[data-tour="cube-publish"]'),
      onHighlightStarted: () => runtime.prepare('finish-visual'),
      popover: {
        title: 'Публикация',
        description:
          'После правок нажмите «Опубликовать» — тогда виджеты увидят новые названия и настройки. Пока статус «Черновик», в дашбордах старая версия.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: () => pickVisibleTourTarget('[data-tour="cube-help"]'),
      popover: {
        title: 'Повторить обучение',
        description:
          'Кнопка «?» всегда под рукой. Демо-правки из тура отменятся после завершения — ваш черновик вернётся как был.',
        side: 'bottom',
        align: 'end',
      },
    },
  ];
}
