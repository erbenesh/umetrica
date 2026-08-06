import type {
  SemanticCubeDefinition,
  SemanticDimension,
  SemanticGraphLayout,
  SemanticMeasure,
} from '@sellerpool/core';
import { buildMemberPreviewQuery, semanticCubeLabel, semanticCubeNodeId, semanticMemberLabel, semanticSourceNodeId } from '@sellerpool/core';
import {
  Box,
  Calendar,
  GitMerge,
  Hash,
  Lock,
  Maximize2,
  Minus,
  Monitor,
  Plus,
  Table,
  Text,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef, type MouseEvent, type PointerEvent } from 'react';

import { FormField } from '@/components/doc/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CANVAS_DRAG_THRESHOLD_PX,
  clientToCanvasSpace,
  isToggleSelectPointer,
  normalizeRect,
  rectsIntersect,
  toggleSetMember,
  type CanvasRect,
} from '@/lib/canvas-graph-utils';
import { useFixedMenuPosition } from '@/lib/context-menu-position';
import {
  DIMENSION_TYPE_LABELS,
  GRANULARITY_LABELS,
  MEASURE_AGGREGATION_LABELS,
  MEASURE_FORMAT_LABELS,
  PALETTE_DIMENSION_LABEL,
  PALETTE_MEASURE_LABEL,
  formatDimensionCount,
  formatMeasureCount,
  labelGranularity,
  labelMeasureAggregation,
  labelMeasureFormat,
} from '@/lib/semantic-labels';
import { cn } from '@/lib/utils';
import { usePreviewSemanticQuery } from '@/hooks/use-semantic';

const NODE_W = 204;
const NODE_H_COMPACT = 88;
const NODE_H_CUBE = 120;
const NODE_H_SOURCE = 130;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 1.5;
const STAGE_PAD = 48;
const STAGE_MIN_W = 860;
const STAGE_MIN_H = 460;

function clampZoom(value: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(value.toFixed(2))));
}

function computeStageBounds(layout: SemanticGraphLayout) {
  const positions = Object.values(layout);
  if (positions.length === 0) {
    return { width: STAGE_MIN_W, height: STAGE_MIN_H, originX: 0, originY: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const pos of positions) {
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + NODE_W);
    maxY = Math.max(maxY, pos.y + NODE_H_SOURCE);
  }

  const originX = Math.min(0, minX - STAGE_PAD);
  const originY = Math.min(0, minY - STAGE_PAD);
  const width = Math.max(STAGE_MIN_W, maxX + STAGE_PAD - originX);
  const height = Math.max(STAGE_MIN_H, maxY + STAGE_PAD - originY);

  return { width, height, originX, originY };
}

export type SemanticNodeId = string;

function nodeCenter(layout: SemanticGraphLayout, id: string, height: number) {
  const pos = layout[id] ?? { x: 0, y: 0 };
  return { x: pos.x + NODE_W / 2, y: pos.y + height / 2 };
}

function buildEdges(
  draft: SemanticCubeDefinition,
  layout: SemanticGraphLayout,
  selected: string,
  sourceNodeId: string,
  cubeNodeId: string
) {
  const source = nodeCenter(layout, sourceNodeId, NODE_H_SOURCE);
  const cube = nodeCenter(layout, cubeNodeId, NODE_H_CUBE);
  const edges: { id: string; d: string; active: boolean }[] = [];

  edges.push({
    id: 'source-cube',
    d: `M ${source.x + NODE_W / 2 - 20} ${source.y} C ${source.x + 60} ${source.y}, ${cube.x - 60} ${cube.y}, ${cube.x - NODE_W / 2 + 8} ${cube.y}`,
    active: selected === sourceNodeId || selected === cubeNodeId,
  });

  for (const measure of draft.measures) {
    const target = nodeCenter(layout, measure.id, NODE_H_COMPACT);
    edges.push({
      id: `cube-${measure.id}`,
      d: `M ${cube.x + NODE_W / 2 - 8} ${cube.y - 20} C ${cube.x + 50} ${cube.y - 20}, ${target.x - 50} ${target.y}, ${target.x - NODE_W / 2 + 8} ${target.y}`,
      active: selected === measure.id || selected === cubeNodeId,
    });
  }

  for (const dimension of draft.dimensions) {
    const target = nodeCenter(layout, dimension.id, NODE_H_COMPACT);
    edges.push({
      id: `cube-${dimension.id}`,
      d: `M ${cube.x} ${cube.y + NODE_H_CUBE / 2 - 8} C ${cube.x} ${cube.y + 70}, ${target.x} ${target.y - 40}, ${target.x} ${target.y - NODE_H_COMPACT / 2 + 8}`,
      active: selected === dimension.id || selected === cubeNodeId,
    });
  }

  return edges;
}

interface SemanticNodeEditorProps {
  draft: SemanticCubeDefinition;
  layout: SemanticGraphLayout;
  selected: SemanticNodeId;
  canWrite: boolean;
  widgetCount: number;
  connectionLabel: string;
  onSelect: (id: SemanticNodeId) => void;
  onDraftChange: (draft: SemanticCubeDefinition) => void;
  onAddMeasure: () => void;
  onAddDimension: () => void;
  onDeleteMeasure?: (id: string) => void;
  onDeleteDimension?: (id: string) => void;
  onLayoutChange?: (layout: SemanticGraphLayout) => void;
}

export type SemanticNodeEditorHandle = {
  centerTourTarget: (selector: string) => Promise<void>;
};

async function waitForPaint() {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function updateMeasure(
  draft: SemanticCubeDefinition,
  id: string,
  patch: Partial<SemanticMeasure>
) {
  return {
    ...draft,
    measures: draft.measures.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  };
}

function updateDimension(
  draft: SemanticCubeDefinition,
  id: string,
  patch: Partial<SemanticDimension>
) {
  return {
    ...draft,
    dimensions: draft.dimensions.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  };
}

function SemanticInspectorPanel({
  draft,
  selected,
  sourceNodeId,
  cubeNodeId,
  canWrite,
  connectionLabel,
  onDraftChange,
  onAddMeasure,
  onAddDimension,
  onDeleteMeasure,
  onDeleteDimension,
}: {
  draft: SemanticCubeDefinition;
  selected: SemanticNodeId;
  sourceNodeId: string;
  cubeNodeId: string;
  canWrite: boolean;
  connectionLabel: string;
  onDraftChange: (draft: SemanticCubeDefinition) => void;
  onAddMeasure: () => void;
  onAddDimension: () => void;
  onDeleteMeasure?: (id: string) => void;
  onDeleteDimension?: (id: string) => void;
}) {
  if (selected === sourceNodeId) {
    return (
      <div className="semantic-panel">
        <div className="semantic-panel__head">
          <h2 className="semantic-panel__title">Таблица · {draft.source.table}</h2>
          <p className="semantic-panel__desc">Откуда берутся сырые данные · {connectionLabel}</p>
        </div>
        <div className="form-fields max-w-none">
          <FormField label="Колонки в таблице">
            <p className="m-0 text-[13px] text-muted-foreground">{draft.source.columns.join(', ')}</p>
          </FormField>
          <details className="semantic-panel__details">
            <summary>SQL и технические настройки</summary>
            <FormField label="SQL-запрос к таблице" hint="Обычно менять не нужно — куб уже создан из этой таблицы.">
              <textarea
                className="flex min-h-[72px] w-full rounded-md border border-input bg-card px-2.5 py-2 font-mono text-[12px]"
                value={draft.source.sql}
                disabled={!canWrite}
                onChange={(event) =>
                  onDraftChange({
                    ...draft,
                    source: { ...draft.source, sql: event.target.value },
                  })
                }
              />
            </FormField>
          </details>
        </div>
        <Link to="/settings/connections" className="text-sm text-primary hover:underline">
          Открыть подключения →
        </Link>
      </div>
    );
  }

  if (selected === cubeNodeId) {
    return (
      <div className="semantic-panel">
        <div className="semantic-panel__head">
          <h2 className="semantic-panel__title">Куб · {semanticCubeLabel(draft)}</h2>
          <p className="semantic-panel__desc">
            Собирает показатели и разрезы — именно это видно в дашбордах
          </p>
        </div>
        <div className="form-fields max-w-none">
          <FormField label="Название в интерфейсе" hint="Как куб называется в списках и настройках.">
            <Input
              value={draft.displayTitle}
              disabled={!canWrite}
              onChange={(event) =>
                onDraftChange({ ...draft, displayTitle: event.target.value })
              }
            />
          </FormField>
          <FormField label="Короткое название" hint="Для узких мест в виджетах и на мобильных.">
            <Input
              value={draft.displayShortTitle ?? ''}
              disabled={!canWrite}
              placeholder={draft.displayTitle}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  displayShortTitle: event.target.value.trim() || undefined,
                })
              }
            />
          </FormField>
          <FormField label="Описание" hint="Необязательно — помогает команде понять, что внутри куба.">
            <textarea
              className="flex min-h-[72px] w-full rounded-md border border-input bg-card px-2.5 py-2 text-[13px]"
              value={draft.description ?? ''}
              disabled={!canWrite}
              onChange={(event) =>
                onDraftChange({ ...draft, description: event.target.value })
              }
            />
          </FormField>
          <details className="semantic-panel__details">
            <summary>SQL и технические настройки</summary>
            <FormField label="SQL-запрос к таблице" hint="Меняйте только если знаете, что делаете.">
              <textarea
                className="flex min-h-[72px] w-full rounded-md border border-input bg-card px-2.5 py-2 font-mono text-[12px]"
                value={draft.source.sql}
                disabled={!canWrite}
                onChange={(event) =>
                  onDraftChange({
                    ...draft,
                    source: { ...draft.source, sql: event.target.value },
                  })
                }
              />
            </FormField>
          </details>
        </div>
      </div>
    );
  }

  if (selected === 'measure:new') {
    return (
      <div className="semantic-panel">
        <div className="semantic-panel__head">
          <h2 className="semantic-panel__title">Новый показатель</h2>
          <p className="semantic-panel__desc">Число для графика: выручка, количество, средний чек</p>
        </div>
        <Button type="button" size="sm" disabled={!canWrite} onClick={onAddMeasure}>
          Добавить показатель
        </Button>
      </div>
    );
  }

  if (selected === 'dimension:new') {
    return (
      <div className="semantic-panel">
        <div className="semantic-panel__head">
          <h2 className="semantic-panel__title">Новый разрез</h2>
          <p className="semantic-panel__desc">По чему делить цифры: дата, статус, регион, товар</p>
        </div>
        <Button type="button" size="sm" disabled={!canWrite} onClick={onAddDimension}>
          Добавить разрез
        </Button>
      </div>
    );
  }

  const measure = draft.measures.find((item) => item.id === selected);
  if (measure) {
    return (
      <div className="semantic-panel">
        <div className="semantic-panel__head">
          <h2 className="semantic-panel__title">Показатель · {semanticMemberLabel(measure)}</h2>
          <p className="semantic-panel__desc">{measure.description ?? measure.title}</p>
        </div>
        <div className="form-fields max-w-none">
          <FormField label="Системный код" hint="Техническое имя — менять не нужно, если виджеты уже настроены.">
            <Input value={measure.name} disabled />
          </FormField>
          <FormField label="Название в дашборде" hint="Так показатель увидит команда: «Выручка», «Кол-во заказов».">
            <Input
              data-tour="cube-inspector-title"
              value={measure.title}
              disabled={!canWrite}
              onChange={(event) =>
                onDraftChange(updateMeasure(draft, measure.id, { title: event.target.value }))
              }
            />
          </FormField>
          <FormField label="Короткое название" hint="Для осей графиков и узких колонок.">
            <Input
              value={measure.shortTitle ?? ''}
              disabled={!canWrite}
              placeholder={measure.title}
              onChange={(event) =>
                onDraftChange(
                  updateMeasure(draft, measure.id, {
                    shortTitle: event.target.value.trim() || undefined,
                  })
                )
              }
            />
          </FormField>
          <FormField label="Колонка в таблице" hint="Из какого поля базы считать значение.">
            <Input
              value={measure.sql}
              disabled={!canWrite}
              list="semantic-column-options"
              onChange={(event) =>
                onDraftChange(updateMeasure(draft, measure.id, { sql: event.target.value }))
              }
            />
          </FormField>
          <FormField label="Как считать" hint="Суммировать продажи, считать строки или брать среднее.">
            <select
              className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
              value={measure.type}
              disabled={!canWrite}
              onChange={(event) =>
                onDraftChange(
                  updateMeasure(draft, measure.id, {
                    type: event.target.value as SemanticMeasure['type'],
                  })
                )
              }
            >
              {Object.entries(MEASURE_AGGREGATION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Формат числа" hint="Валюта, процент или обычное число в виджетах.">
            <select
              className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
              value={measure.format ?? ''}
              disabled={!canWrite}
              onChange={(event) =>
                onDraftChange(
                  updateMeasure(draft, measure.id, {
                    format: (event.target.value || undefined) as SemanticMeasure['format'],
                  })
                )
              }
            >
              <option value="">—</option>
              {Object.entries(MEASURE_FORMAT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        {canWrite && draft.measures.length > 1 ? (
          <Button
            variant="outline"
            size="sm"
            type="button"
            className="text-destructive"
            onClick={() => onDeleteMeasure?.(measure.id)}
          >
            <Trash2 size={14} />
            Удалить показатель
          </Button>
        ) : null}
      </div>
    );
  }

  const dimension = draft.dimensions.find((item) => item.id === selected);
  if (dimension) {
    return (
      <div className="semantic-panel">
        <div className="semantic-panel__head">
          <h2 className="semantic-panel__title">Разрез · {semanticMemberLabel(dimension)}</h2>
          <p className="semantic-panel__desc">{dimension.description ?? dimension.title}</p>
        </div>
        <div className="form-fields max-w-none">
          <FormField label="Системный код" hint="Техническое имя — менять не нужно, если виджеты уже настроены.">
            <Input value={dimension.name} disabled />
          </FormField>
          <FormField label="Название в дашборде" hint="По чему группировать: «Дата», «Статус», «Регион».">
            <Input
              value={dimension.title}
              disabled={!canWrite || dimension.locked}
              onChange={(event) =>
                onDraftChange(updateDimension(draft, dimension.id, { title: event.target.value }))
              }
            />
          </FormField>
          <FormField label="Короткое название" hint="Для фильтров и компактных подписей.">
            <Input
              value={dimension.shortTitle ?? ''}
              disabled={!canWrite || dimension.locked}
              placeholder={dimension.title}
              onChange={(event) =>
                onDraftChange(
                  updateDimension(draft, dimension.id, {
                    shortTitle: event.target.value.trim() || undefined,
                  })
                )
              }
            />
          </FormField>
          <FormField label="Колонка в таблице" hint="Из какого поля базы брать значение разреза.">
            <Input
              value={dimension.sql}
              disabled={!canWrite || dimension.locked}
              list="semantic-column-options"
              onChange={(event) =>
                onDraftChange(updateDimension(draft, dimension.id, { sql: event.target.value }))
              }
            />
          </FormField>
          <FormField label="Тип данных" hint="Время — для графиков по дням и месяцам.">
            <select
              className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
              value={dimension.type}
              disabled={!canWrite || dimension.locked}
              onChange={(event) =>
                onDraftChange(
                  updateDimension(draft, dimension.id, {
                    type: event.target.value as SemanticDimension['type'],
                  })
                )
              }
            >
              {Object.entries(DIMENSION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
          {dimension.type === 'time' ? (
            <FormField label="Шаг по времени" hint="Как группировать даты на графике: по дням, неделям или месяцам.">
              <select
                className="flex h-8 w-full rounded-md border border-input bg-card px-2.5 text-[13px]"
                value={dimension.granularity ?? 'day'}
                disabled={!canWrite}
                onChange={(event) =>
                  onDraftChange(
                    updateDimension(draft, dimension.id, {
                      granularity: event.target.value as SemanticDimension['granularity'],
                    })
                  )
                }
              >
                {Object.entries(GRANULARITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </FormField>
          ) : null}
        </div>
        {dimension.locked ? (
          <p className="text-xs text-muted-foreground">Системный разрез нельзя удалить.</p>
        ) : canWrite && draft.dimensions.filter((item) => !item.locked).length > 0 &&
          draft.dimensions.length > 1 ? (
          <Button
            variant="outline"
            size="sm"
            type="button"
            className="text-destructive"
            onClick={() => onDeleteDimension?.(dimension.id)}
          >
            <Trash2 size={14} />
            Удалить разрез
          </Button>
        ) : null}
      </div>
    );
  }

  return null;
}

function ColumnDatalist({ columns }: { columns: string[] }) {
  return (
    <datalist id="semantic-column-options">
      {columns.map((column) => (
        <option key={column} value={column} />
      ))}
    </datalist>
  );
}

function SemanticMemberPreview({
  draft,
  selected,
  sourceNodeId,
  cubeNodeId,
  widgetCount,
}: {
  draft: SemanticCubeDefinition;
  selected: SemanticNodeId;
  sourceNodeId: string;
  cubeNodeId: string;
  widgetCount: number;
}) {
  const previewQuery = usePreviewSemanticQuery();
  const queryObject = buildMemberPreviewQuery(draft, selected, sourceNodeId, cubeNodeId);
  const [queryText, setQueryText] = useState(JSON.stringify(queryObject, null, 2));
  const [sampleValue, setSampleValue] = useState('—');

  useEffect(() => {
    setQueryText(JSON.stringify(queryObject, null, 2));
  }, [selected, draft.name]);

  const memberName =
    draft.measures.find((item) => item.id === selected)?.name ??
    draft.dimensions.find((item) => item.id === selected)?.name ??
    (selected === cubeNodeId ? draft.name : selected === sourceNodeId ? draft.source.table : '');

  const runPreview = async () => {
    try {
      const parsed = JSON.parse(queryText) as Record<string, unknown>;
      const result = await previewQuery.mutateAsync(parsed);
      setSampleValue(result.sampleValue);
    } catch {
      setSampleValue('ошибка');
    }
  };

  return (
    <div className="semantic-preview">
      <div className="semantic-preview__head">
        <span>Проверка данных</span>
        <Button variant="outline" size="sm" type="button" onClick={runPreview} disabled={previewQuery.isPending}>
          {previewQuery.isPending ? 'Загрузка…' : 'Показать пример'}
        </Button>
      </div>
      <div className="semantic-preview__body">
        {memberName ? (
          <p className="semantic-preview__member">
            {selected === sourceNodeId ? memberName : `${draft.name}.${memberName}`}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Выберите показатель или разрез на схеме.</p>
        )}
        <dl className="semantic-preview__meta-list">
          <div>
            <dt>Пример значения</dt>
            <dd className="semantic-preview__sample">{sampleValue}</dd>
          </div>
        </dl>
        <details className="semantic-panel__details semantic-preview__details">
          <summary>Технический запрос</summary>
          <p className="m-0 text-xs text-muted-foreground">Для отладки — обычно не нужен.</p>
          <textarea
            className="semantic-preview__query"
            value={queryText}
            spellCheck={false}
            onChange={(event) => setQueryText(event.target.value)}
          />
        </details>
        <ul className="semantic-preview__links m-0 list-none p-0">
          <li>
            <Link to="/dashboards">
              {widgetCount === 0
                ? 'Добавить в дашборд →'
                : `Используется в ${widgetCount} виджетах →`}
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}

export const SemanticNodeEditor = forwardRef<SemanticNodeEditorHandle, SemanticNodeEditorProps>(
  function SemanticNodeEditor(
    {
  draft,
  layout,
  selected,
  canWrite,
  widgetCount,
  connectionLabel,
  onSelect,
  onDraftChange,
  onAddMeasure,
  onAddDimension,
  onDeleteMeasure,
  onDeleteDimension,
  onLayoutChange,
    },
    ref
  ) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [draggingCanvas, setDraggingCanvas] = useState(false);
  const [canvasSelection, setCanvasSelection] = useState<Set<string>>(new Set());
  const [marqueeRect, setMarqueeRect] = useState<CanvasRect | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeIds: Set<string>;
    anchorId: string;
  } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const panStateRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef<{
    startX: number;
    startY: number;
    moved: boolean;
    origins: Map<string, { x: number; y: number }>;
    openNodeId: string | null;
    selectionOnly: boolean;
  } | null>(null);
  const canvasPointerRef = useRef<{
    startX: number;
    startY: number;
    originPanX: number;
    originPanY: number;
    mode: 'pending' | 'pan' | 'marquee';
    additive: boolean;
    baseSelection: Set<string>;
  } | null>(null);
  const skipOpenRef = useRef(false);

  zoomRef.current = zoom;
  panStateRef.current = pan;
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const centerTourTarget = useCallback(async (selector: string) => {
    const canvas = canvasRef.current;
    const target = canvas?.querySelector(selector) ?? document.querySelector(selector);
    if (!(target instanceof HTMLElement)) return;

    if (canvas?.contains(target)) {
      const canvasRect = canvas.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const deltaX =
        canvasRect.left + canvasRect.width / 2 - (targetRect.left + targetRect.width / 2);
      const deltaY =
        canvasRect.top + canvasRect.height / 2 - (targetRect.top + targetRect.height / 2);

      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        setPan((prev) => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY,
        }));
        await waitForPaint();
      }
      return;
    }

    target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
    await waitForPaint();
  }, []);

  useImperativeHandle(ref, () => ({ centerTourTarget }), [centerTourTarget]);

  const sourceNodeId = semanticSourceNodeId(draft.source.table);
  const cubeNodeId = semanticCubeNodeId(draft.name);
  const stageBounds = useMemo(() => computeStageBounds(layout), [layout]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCanvasSelection(new Set());
        setContextMenu(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('pointerdown', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [contextMenu]);

  const getNodeHeight = useCallback(
    (nodeId: string) => {
      if (nodeId === sourceNodeId) return NODE_H_SOURCE;
      if (nodeId === cubeNodeId) return NODE_H_CUBE;
      return NODE_H_COMPACT;
    },
    [cubeNodeId, sourceNodeId]
  );

  const canvasNodeIds = useMemo(
    () => [
      sourceNodeId,
      cubeNodeId,
      ...draft.measures.map((item) => item.id),
      ...draft.dimensions.map((item) => item.id),
    ],
    [cubeNodeId, draft.dimensions, draft.measures, sourceNodeId]
  );

  const getNodeRect = useCallback(
    (nodeId: string): CanvasRect => {
      const pos = layout[nodeId] ?? { x: 0, y: 0 };
      return {
        left: pos.x - stageBounds.originX,
        top: pos.y - stageBounds.originY,
        width: NODE_W,
        height: getNodeHeight(nodeId),
      };
    },
    [getNodeHeight, layout, stageBounds.originX, stageBounds.originY]
  );

  const collectMarqueeSelection = useCallback(
    (rect: CanvasRect) =>
      canvasNodeIds.filter((nodeId) => rectsIntersect(rect, getNodeRect(nodeId))),
    [canvasNodeIds, getNodeRect]
  );
  const toStagePos = useCallback(
    (x: number, y: number) => ({
      left: x - stageBounds.originX,
      top: y - stageBounds.originY,
    }),
    [stageBounds.originX, stageBounds.originY]
  );
  const edges = buildEdges(draft, layout, selected, sourceNodeId, cubeNodeId);

  const beginNodePointer = (nodeId: string, event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    skipOpenRef.current = false;
    setContextMenu(null);

    let selectionOnly = false;
    let activeSelection = canvasSelection;

    if (isToggleSelectPointer(event)) {
      event.preventDefault();
      activeSelection = toggleSetMember(canvasSelection, nodeId);
      setCanvasSelection(activeSelection);
      if (!activeSelection.has(nodeId)) return;
      selectionOnly = true;
    } else if (event.shiftKey) {
      activeSelection = new Set([...canvasSelection, nodeId]);
      setCanvasSelection(activeSelection);
      selectionOnly = true;
    }

    const moveIds =
      activeSelection.has(nodeId) && activeSelection.size > 0 ? activeSelection : new Set([nodeId]);

    if (!canWrite || !onLayoutChange) {
      dragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        origins: new Map(),
        openNodeId: selectionOnly ? null : nodeId,
        selectionOnly,
      };
      canvasRef.current?.setPointerCapture(event.pointerId);
      return;
    }

    const origins = new Map<string, { x: number; y: number }>();
    for (const id of moveIds) {
      origins.set(id, layout[id] ?? { x: 0, y: 0 });
    }

    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      origins,
      openNodeId: selectionOnly ? null : nodeId,
      selectionOnly,
    };
    setDraggingCanvas(true);
    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const handleNodeContextMenu = (nodeId: string, event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();

    dragRef.current = null;
    setDraggingCanvas(false);

    const nodeIds = canvasSelection.has(nodeId) ? new Set(canvasSelection) : new Set([nodeId]);
    if (!canvasSelection.has(nodeId)) {
      setCanvasSelection(nodeIds);
    }

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      nodeIds,
      anchorId: nodeId,
    });
  };

  const beginCanvasPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    const target = event.target as HTMLElement;
    if (target.closest('.node')) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvasPointerRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originPanX: panStateRef.current.x,
      originPanY: panStateRef.current.y,
      mode: event.shiftKey ? 'marquee' : 'pending',
      additive: isToggleSelectPointer(event),
      baseSelection: new Set(canvasSelection),
    };
    if (event.shiftKey) {
      setMarqueeRect({ left: 0, top: 0, width: 0, height: 0 });
    }
    canvas.setPointerCapture(event.pointerId);
  };

  const moveCanvasPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current && onLayoutChange) {
      const dx = event.clientX - dragRef.current.startX;
      const dy = event.clientY - dragRef.current.startY;
      if (!dragRef.current.moved && Math.hypot(dx, dy) < CANVAS_DRAG_THRESHOLD_PX) return;

      dragRef.current.moved = true;
      skipOpenRef.current = true;
      const offsetX = dx / zoomRef.current;
      const offsetY = dy / zoomRef.current;
      const nextLayout = { ...layoutRef.current };
      for (const [id, origin] of dragRef.current.origins) {
        nextLayout[id] = { x: origin.x + offsetX, y: origin.y + offsetY };
      }
      onLayoutChange(nextLayout);
      return;
    }

    const ptr = canvasPointerRef.current;
    const canvas = canvasRef.current;
    if (!ptr || !canvas) return;

    const dx = event.clientX - ptr.startX;
    const dy = event.clientY - ptr.startY;

    if (ptr.mode === 'pending' && Math.hypot(dx, dy) >= CANVAS_DRAG_THRESHOLD_PX) {
      ptr.mode = 'pan';
      setIsPanning(true);
    }

    if (ptr.mode === 'pan') {
      setPan({
        x: ptr.originPanX + dx,
        y: ptr.originPanY + dy,
      });
      return;
    }

    if (ptr.mode === 'marquee') {
      const rect = canvas.getBoundingClientRect();
      const start = clientToCanvasSpace(
        ptr.startX,
        ptr.startY,
        rect,
        panStateRef.current,
        zoomRef.current
      );
      const current = clientToCanvasSpace(
        event.clientX,
        event.clientY,
        rect,
        panStateRef.current,
        zoomRef.current
      );
      const nextRect = normalizeRect(start.x, start.y, current.x, current.y);
      setMarqueeRect(nextRect);
      const hits = collectMarqueeSelection(nextRect);
      setCanvasSelection(
        ptr.additive ? new Set([...ptr.baseSelection, ...hits]) : new Set(hits)
      );
    }
  };

  const endCanvasPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      const drag = dragRef.current;
      dragRef.current = null;
      setDraggingCanvas(false);
      canvasRef.current?.releasePointerCapture(event.pointerId);

      if (event.button !== 0) {
        skipOpenRef.current = false;
        return;
      }

      if (!drag.moved && drag.openNodeId && !drag.selectionOnly && !skipOpenRef.current) {
        onSelect(drag.openNodeId);
      }
      skipOpenRef.current = false;
      return;
    }

    const ptr = canvasPointerRef.current;
    if (!ptr) return;

    if (ptr.mode === 'pending') {
      setCanvasSelection(new Set());
    }

    canvasPointerRef.current = null;
    setIsPanning(false);
    setMarqueeRect(null);
    canvasRef.current?.releasePointerCapture(event.pointerId);
  };

  const applyZoomAtPoint = useCallback((nextZoom: number, clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const currentZoom = zoomRef.current;
    const clamped = clampZoom(nextZoom);
    if (clamped === currentZoom) return;

    if (!canvas) {
      setZoom(clamped);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const offsetY = clientY - rect.top;
    const { x: panX, y: panY } = panStateRef.current;
    const stageX = (offsetX - panX) / currentZoom;
    const stageY = (offsetY - panY) / currentZoom;

    setZoom(clamped);
    setPan({
      x: offsetX - stageX * clamped,
      y: offsetY - stageY * clamped,
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const intensity = event.ctrlKey || event.metaKey ? 0.002 : 0.0012;
      const nextZoom = zoomRef.current * (1 - event.deltaY * intensity);
      applyZoomAtPoint(nextZoom, event.clientX, event.clientY);
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [applyZoomAtPoint]);

  const nodePointerProps = (nodeId: string) => ({
    onPointerDown: (event: PointerEvent<HTMLElement>) => beginNodePointer(nodeId, event),
    onContextMenu: (event: MouseEvent<HTMLElement>) => handleNodeContextMenu(nodeId, event),
  });

  const contextMenuActions = useMemo(() => {
    if (!contextMenu) return null;

    const { anchorId, nodeIds } = contextMenu;
    const measure = draft.measures.find((item) => item.id === anchorId);
    const dimension = draft.dimensions.find((item) => item.id === anchorId);
    const canDeleteMeasure =
      canWrite &&
      Boolean(measure) &&
      draft.measures.length > 1 &&
      Boolean(onDeleteMeasure);
    const canDeleteDimension =
      canWrite &&
      Boolean(dimension) &&
      !dimension?.locked &&
      draft.dimensions.filter((item) => !item.locked).length > 0 &&
      draft.dimensions.length > 1 &&
      Boolean(onDeleteDimension);

    return {
      anchorId,
      selectionCount: nodeIds.size,
      canDeleteMeasure,
      canDeleteDimension,
      measureId: measure?.id,
      dimensionId: dimension?.id,
    };
  }, [canWrite, contextMenu, draft.dimensions, draft.measures, onDeleteDimension, onDeleteMeasure]);

  const selectionCount = canvasSelection.size;
  const contextMenuPosition = useFixedMenuPosition(
    contextMenu?.x ?? 0,
    contextMenu?.y ?? 0,
    Boolean(contextMenu)
  );

  return (
    <div className="node-editor-page">
      <div className="node-editor">
        <aside className="node-palette" aria-label="Палитра элементов">
          <div className="node-palette__head">
            <p className="node-palette__title">Добавить</p>
          </div>
          <button className="node-palette__item node-palette__item--source" type="button" disabled>
            <Table size={18} />
            <span>Таблица</span>
          </button>
          <button className="node-palette__item node-palette__item--cube" type="button" disabled>
            <Box size={18} />
            <span>Куб</span>
          </button>
          <button
            className="node-palette__item node-palette__item--measure"
            type="button"
            disabled={!canWrite}
            onClick={() => onSelect('measure:new')}
          >
            <Hash size={18} />
            <span>{PALETTE_MEASURE_LABEL}</span>
          </button>
          <button
            className="node-palette__item node-palette__item--dimension"
            type="button"
            disabled={!canWrite}
            onClick={() => onSelect('dimension:new')}
          >
            <Text size={18} />
            <span>{PALETTE_DIMENSION_LABEL}</span>
          </button>
          <button className="node-palette__item is-disabled" type="button" disabled>
            <GitMerge size={18} />
            <span>Связь</span>
          </button>
          <p className="node-palette__hint">
            Нажмите «Показатель» или «Разрез», чтобы добавить поле. Связи между кубами — во вкладке «Связи».
          </p>
        </aside>

        <div
          className={cn('node-canvas-wrap', canWrite && 'node-canvas-wrap--writable')}
          data-tour="cube-canvas"
        >
          <div className="node-canvas-mobile">
            <Monitor className="size-5 shrink-0" strokeWidth={1.75} />
            <span>
              Нажмите на карточку — справа откроются настройки. Оранжевые — цифры, фиолетовые — разрезы.
            </span>
          </div>
          <div className="node-canvas-toolbar">
            <div className="node-canvas-toolbar__quick">
              {canWrite ? (
                <>
                  <Button variant="outline" size="sm" type="button" onClick={onAddMeasure}>
                    <Hash size={14} />
                    {PALETTE_MEASURE_LABEL}
                  </Button>
                  <Button variant="outline" size="sm" type="button" onClick={onAddDimension}>
                    <Text size={14} />
                    {PALETTE_DIMENSION_LABEL}
                  </Button>
                </>
              ) : null}
            </div>
            {selectionCount > 0 ? (
              <span className="node-canvas-toolbar__selection">
                {selectionCount} выбрано
                <button
                  type="button"
                  className="node-canvas-toolbar__selection-clear"
                  onClick={() => setCanvasSelection(new Set())}
                >
                  Сбросить
                </button>
              </span>
            ) : null}
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              aria-label="Уменьшить"
              onClick={() => {
                const canvas = canvasRef.current;
                if (!canvas) {
                  setZoom((value) => clampZoom(value - 0.1));
                  return;
                }
                const rect = canvas.getBoundingClientRect();
                applyZoomAtPoint(zoom - 0.1, rect.left + rect.width / 2, rect.top + rect.height / 2);
              }}
            >
              <Minus size={16} />
            </Button>
            <span className="node-canvas-toolbar__zoom">{Math.round(zoom * 100)}%</span>
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              aria-label="Увеличить"
              onClick={() => {
                const canvas = canvasRef.current;
                if (!canvas) {
                  setZoom((value) => clampZoom(value + 0.1));
                  return;
                }
                const rect = canvas.getBoundingClientRect();
                applyZoomAtPoint(zoom + 0.1, rect.left + rect.width / 2, rect.top + rect.height / 2);
              }}
            >
              <Plus size={16} />
            </Button>
            <span className="node-canvas-toolbar__spacer" />
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
            >
              <Maximize2 size={14} />
              Вписать
            </Button>
            <Button variant="ghost" size="sm" type="button" onClick={() => onSelect(cubeNodeId)}>
              <Box size={14} />
              Куб
            </Button>
          </div>

          <div
            ref={canvasRef}
            className={cn('node-canvas', isPanning && 'is-panning')}
            onPointerDown={beginCanvasPointer}
            onPointerMove={moveCanvasPointer}
            onPointerUp={endCanvasPointer}
            onPointerCancel={endCanvasPointer}
          >
            <div
              className="node-canvas__stage"
              style={{
                width: stageBounds.width,
                height: stageBounds.height,
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'top left',
              }}
            >
              <svg
                className="node-edges"
                aria-hidden="true"
                width={stageBounds.width}
                height={stageBounds.height}
              >
                <g transform={`translate(${-stageBounds.originX} ${-stageBounds.originY})`}>
                  {edges.map((edge) => (
                    <path
                      key={edge.id}
                      d={edge.d}
                      className={cn(edge.active && 'is-active')}
                    />
                  ))}
                </g>
              </svg>

              {marqueeRect ? (
                <div
                  className="canvas-marquee"
                  style={{
                    left: marqueeRect.left,
                    top: marqueeRect.top,
                    width: marqueeRect.width,
                    height: marqueeRect.height,
                  }}
                />
              ) : null}

              <article
                className={cn(
                  'node node--source',
                  selected === sourceNodeId && 'is-selected',
                  canvasSelection.has(sourceNodeId) && 'is-canvas-selected',
                  draggingCanvas && canvasSelection.has(sourceNodeId) && 'is-dragging'
                )}
                style={toStagePos(layout[sourceNodeId]?.x ?? 0, layout[sourceNodeId]?.y ?? 0)}
                {...nodePointerProps(sourceNodeId)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    onSelect(sourceNodeId);
                  }
                }}
              >
                <header className="node__header">
                  <span className="node__icon">
                    <Table size={14} />
                  </span>
                  <div className="node__titles">
                    <h3 className="node__title">{draft.source.table}</h3>
                    <p className="node__type">Источник · {connectionLabel}</p>
                  </div>
                </header>
                <div className="node__body">
                  <div className="node__chips">
                    {draft.source.columns.slice(0, 4).map((column) => (
                      <span key={column} className="node__chip">
                        {column}
                      </span>
                    ))}
                    {draft.source.columns.length > 4 ? (
                      <span className="node__chip">+{draft.source.columns.length - 4}</span>
                    ) : null}
                  </div>
                </div>
              </article>

              <article
                data-tour="cube-cube"
                className={cn(
                  'node node--cube',
                  selected === cubeNodeId && 'is-selected',
                  canvasSelection.has(cubeNodeId) && 'is-canvas-selected',
                  draggingCanvas && canvasSelection.has(cubeNodeId) && 'is-dragging'
                )}
                style={toStagePos(layout[cubeNodeId]?.x ?? 0, layout[cubeNodeId]?.y ?? 0)}
                {...nodePointerProps(cubeNodeId)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    onSelect(cubeNodeId);
                  }
                }}
              >
                <header className="node__header">
                  <span className="node__icon">
                    <Box size={14} />
                  </span>
                  <div className="node__titles">
                    <h3 className="node__title">{semanticCubeLabel(draft)}</h3>
                    <p className="node__type">
                      Куб · {draft.name} · {formatMeasureCount(draft.measures.length)} ·{' '}
                      {formatDimensionCount(draft.dimensions.length)}
                    </p>
                  </div>
                </header>
                <div className="node__body">
                  <div className="node__field">
                    <span>Заголовок</span>
                    <span>{draft.displayTitle}</span>
                  </div>
                  <div className="node__field">
                    <span>SQL</span>
                    <code>{draft.source.sql}</code>
                  </div>
                </div>
              </article>

              {draft.measures.map((measure, measureIndex) => (
                <article
                  key={measure.id}
                  data-tour={measureIndex === 0 ? 'cube-measure' : undefined}
                  className={cn(
                    'node node--measure node--compact',
                    selected === measure.id && 'is-selected',
                    canvasSelection.has(measure.id) && 'is-canvas-selected',
                    draggingCanvas && canvasSelection.has(measure.id) && 'is-dragging'
                  )}
                  style={toStagePos(layout[measure.id]?.x ?? 0, layout[measure.id]?.y ?? 0)}
                  {...nodePointerProps(measure.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      onSelect(measure.id);
                    }
                  }}
                >
                  <header className="node__header">
                    <span className="node__icon">
                      <Hash size={14} />
                    </span>
                    <div className="node__titles">
                      <h3 className="node__title">{semanticMemberLabel(measure)}</h3>
                      <p className="node__type">
                        Показатель · {labelMeasureAggregation(measure.type)}
                      </p>
                    </div>
                  </header>
                  <div className="node__body">
                    <div className="node__field">
                      <span>Колонка</span>
                      <code>{measure.sql}</code>
                    </div>
                    {measure.format ? (
                      <div className="node__field">
                        <span>Формат</span>
                        <span>{labelMeasureFormat(measure.format)}</span>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}

              {draft.dimensions.map((dimension) => (
                <article
                  key={dimension.id}
                  className={cn(
                    'node node--dimension node--compact',
                    dimension.locked && 'node--locked node--system',
                    selected === dimension.id && 'is-selected',
                    canvasSelection.has(dimension.id) && 'is-canvas-selected',
                    draggingCanvas && canvasSelection.has(dimension.id) && 'is-dragging'
                  )}
                  style={toStagePos(layout[dimension.id]?.x ?? 0, layout[dimension.id]?.y ?? 0)}
                  {...nodePointerProps(dimension.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      onSelect(dimension.id);
                    }
                  }}
                >
                  <header className="node__header">
                    <span className="node__icon">
                      {dimension.locked ? (
                        <Lock size={14} />
                      ) : dimension.type === 'time' ? (
                        <Calendar size={14} />
                      ) : (
                        <Text size={14} />
                      )}
                    </span>
                    <div className="node__titles">
                      <h3 className="node__title">{semanticMemberLabel(dimension)}</h3>
                      <p className="node__type">
                        {dimension.locked ? 'Системный разрез' : 'Разрез'} ·{' '}
                        {DIMENSION_TYPE_LABELS[dimension.type]}
                      </p>
                    </div>
                  </header>
                  <div className="node__body">
                    <div className="node__field">
                      <span>Колонка</span>
                      <code>{dimension.sql}</code>
                    </div>
                    {dimension.granularity ? (
                      <div className="node__field">
                        <span>Детализация</span>
                        <span>{labelGranularity(dimension.granularity ?? 'day')}</span>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        <aside className="node-inspector" aria-label="Свойства элемента" data-tour="cube-inspector">
          <div className="node-inspector__main">
            <SemanticInspectorPanel
              draft={draft}
              selected={selected}
              sourceNodeId={sourceNodeId}
              cubeNodeId={cubeNodeId}
              canWrite={canWrite}
              connectionLabel={connectionLabel}
              onDraftChange={onDraftChange}
              onAddMeasure={onAddMeasure}
              onAddDimension={onAddDimension}
              onDeleteMeasure={onDeleteMeasure}
              onDeleteDimension={onDeleteDimension}
            />
          </div>
          <div className="semantic-preview">
            <SemanticMemberPreview
              draft={draft}
              selected={selected}
              sourceNodeId={sourceNodeId}
              cubeNodeId={cubeNodeId}
              widgetCount={widgetCount}
            />
          </div>
          <ColumnDatalist columns={draft.source.columns} />
        </aside>
      </div>

      {contextMenu && contextMenuActions ? (
        <div
          ref={contextMenuPosition.ref}
          className="workspace-context-menu"
          style={contextMenuPosition.position}
          role="menu"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="workspace-context-menu__item"
            role="menuitem"
            onClick={() => {
              setContextMenu(null);
              onSelect(contextMenuActions.anchorId);
            }}
          >
            {contextMenuActions.selectionCount > 1 ? 'Открыть в инспекторе' : 'Открыть'}
          </button>
          {contextMenuActions.canDeleteMeasure && contextMenuActions.measureId ? (
            <button
              type="button"
              className="workspace-context-menu__item"
              role="menuitem"
              onClick={() => {
                setContextMenu(null);
                onDeleteMeasure?.(contextMenuActions.measureId!);
              }}
            >
              Удалить показатель
            </button>
          ) : null}
          {contextMenuActions.canDeleteDimension && contextMenuActions.dimensionId ? (
            <button
              type="button"
              className="workspace-context-menu__item"
              role="menuitem"
              onClick={() => {
                setContextMenu(null);
                onDeleteDimension?.(contextMenuActions.dimensionId!);
              }}
            >
              Удалить разрез
            </button>
          ) : null}
          {contextMenuActions.selectionCount > 1 ? (
            <p className="workspace-context-menu__hint">{contextMenuActions.selectionCount} элементов выбрано</p>
          ) : null}
          <button
            type="button"
            className="workspace-context-menu__item workspace-context-menu__item--muted"
            role="menuitem"
            onClick={() => {
              setContextMenu(null);
              setCanvasSelection(new Set());
            }}
          >
            Снять выделение
          </button>
        </div>
      ) : null}
    </div>
  );
});
