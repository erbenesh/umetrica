import type {
  SemanticCubeDefinition,
  SemanticDimension,
  SemanticGraphLayout,
  SemanticMeasure,
} from '@umetrica/core';
import { semanticCubeNodeId, semanticSourceNodeId } from '@umetrica/core';
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
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRef, useState, type PointerEvent } from 'react';

import { FormField } from '@/components/doc/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const NODE_W = 204;
const NODE_H_COMPACT = 88;
const NODE_H_CUBE = 120;
const NODE_H_SOURCE = 130;

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
  onLayoutChange?: (layout: SemanticGraphLayout) => void;
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
}) {
  if (selected === sourceNodeId) {
    return (
      <div className="semantic-panel">
        <div className="semantic-panel__head">
          <h2 className="semantic-panel__title">Таблица · {draft.source.table}</h2>
          <p className="semantic-panel__desc">Источник · {connectionLabel}</p>
        </div>
        <dl className="semantic-preview__meta-list">
          <div>
            <dt>SQL</dt>
            <dd>
              <code>{draft.source.sql}</code>
            </dd>
          </div>
          <div>
            <dt>Колонки</dt>
            <dd>{draft.source.columns.join(', ')}</dd>
          </div>
        </dl>
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
          <h2 className="semantic-panel__title">Куб · {draft.name}</h2>
          <p className="semantic-panel__desc">Центральная нода semantic layer</p>
        </div>
        <div className="form-fields max-w-none">
          <FormField label="Заголовок">
            <Input
              value={draft.displayTitle}
              disabled={!canWrite}
              onChange={(event) =>
                onDraftChange({ ...draft, displayTitle: event.target.value })
              }
            />
          </FormField>
          <FormField label="Описание">
            <textarea
              className="flex min-h-[72px] w-full rounded-md border border-input bg-card px-2.5 py-2 text-[13px]"
              value={draft.description ?? ''}
              disabled={!canWrite}
              onChange={(event) =>
                onDraftChange({ ...draft, description: event.target.value })
              }
            />
          </FormField>
          <FormField label="SQL источник">
            <pre className="code-block code-block--sm m-0">{draft.source.sql}</pre>
          </FormField>
        </div>
      </div>
    );
  }

  if (selected === 'measure:new') {
    return (
      <div className="semantic-panel">
        <div className="semantic-panel__head">
          <h2 className="semantic-panel__title">Новая мера</h2>
          <p className="semantic-panel__desc">Добавьте агрегат на canvas</p>
        </div>
        <Button type="button" size="sm" disabled={!canWrite} onClick={onAddMeasure}>
          Добавить меру
        </Button>
      </div>
    );
  }

  if (selected === 'dimension:new') {
    return (
      <div className="semantic-panel">
        <div className="semantic-panel__head">
          <h2 className="semantic-panel__title">Новое измерение</h2>
          <p className="semantic-panel__desc">Добавьте поле группировки на canvas</p>
        </div>
        <Button type="button" size="sm" disabled={!canWrite} onClick={onAddDimension}>
          Добавить измерение
        </Button>
      </div>
    );
  }

  const measure = draft.measures.find((item) => item.id === selected);
  if (measure) {
    return (
      <div className="semantic-panel">
        <div className="semantic-panel__head">
          <h2 className="semantic-panel__title">Мера · {measure.name}</h2>
          <p className="semantic-panel__desc">{measure.description ?? measure.title}</p>
        </div>
        <div className="form-fields max-w-none">
          <FormField label="Имя member">
            <Input value={measure.name} disabled />
          </FormField>
          <FormField label="Заголовок">
            <Input
              value={measure.title}
              disabled={!canWrite}
              onChange={(event) =>
                onDraftChange(updateMeasure(draft, measure.id, { title: event.target.value }))
              }
            />
          </FormField>
          <FormField label="SQL колонка">
            <Input
              value={measure.sql}
              disabled={!canWrite}
              onChange={(event) =>
                onDraftChange(updateMeasure(draft, measure.id, { sql: event.target.value }))
              }
            />
          </FormField>
          <FormField label="Агрегация">
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
              <option value="sum">sum</option>
              <option value="count">count</option>
              <option value="avg">avg</option>
              <option value="min">min</option>
              <option value="max">max</option>
            </select>
          </FormField>
          <FormField label="Формат">
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
              <option value="currency">currency</option>
              <option value="percent">percent</option>
              <option value="number">number</option>
            </select>
          </FormField>
        </div>
      </div>
    );
  }

  const dimension = draft.dimensions.find((item) => item.id === selected);
  if (dimension) {
    return (
      <div className="semantic-panel">
        <div className="semantic-panel__head">
          <h2 className="semantic-panel__title">Измерение · {dimension.name}</h2>
          <p className="semantic-panel__desc">{dimension.description ?? dimension.title}</p>
        </div>
        <div className="form-fields max-w-none">
          <FormField label="Имя member">
            <Input value={dimension.name} disabled />
          </FormField>
          <FormField label="Заголовок">
            <Input
              value={dimension.title}
              disabled={!canWrite || dimension.locked}
              onChange={(event) =>
                onDraftChange(updateDimension(draft, dimension.id, { title: event.target.value }))
              }
            />
          </FormField>
          <FormField label="SQL колонка">
            <Input
              value={dimension.sql}
              disabled={!canWrite || dimension.locked}
              onChange={(event) =>
                onDraftChange(updateDimension(draft, dimension.id, { sql: event.target.value }))
              }
            />
          </FormField>
          <FormField label="Тип">
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
              <option value="string">string</option>
              <option value="time">time</option>
              <option value="number">number</option>
              <option value="boolean">boolean</option>
            </select>
          </FormField>
          {dimension.type === 'time' ? (
            <FormField label="Granularity">
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
                <option value="day">day</option>
                <option value="week">week</option>
                <option value="month">month</option>
                <option value="year">year</option>
              </select>
            </FormField>
          ) : null}
        </div>
        {dimension.locked ? (
          <p className="text-xs text-muted-foreground">Системное измерение tenantId нельзя удалить.</p>
        ) : null}
      </div>
    );
  }

  return null;
}

export function SemanticNodeEditor({
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
  onLayoutChange,
}: SemanticNodeEditorProps) {
  const [zoom, setZoom] = useState(1);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const sourceNodeId = semanticSourceNodeId(draft.source.table);
  const cubeNodeId = semanticCubeNodeId(draft.name);
  const edges = buildEdges(draft, layout, selected, sourceNodeId, cubeNodeId);
  const memberName =
    draft.measures.find((item) => item.id === selected)?.name ??
    draft.dimensions.find((item) => item.id === selected)?.name ??
    (selected === cubeNodeId ? draft.name : selected === sourceNodeId ? draft.source.table.split('.').pop() ?? '' : '');

  const beginDrag = (nodeId: string, event: PointerEvent<HTMLElement>) => {
    if (!canWrite || !onLayoutChange) return;
    event.stopPropagation();
    const pos = layout[nodeId] ?? { x: 0, y: 0 };
    dragRef.current = {
      id: nodeId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pos.x,
      originY: pos.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: PointerEvent<HTMLElement>) => {
    if (!dragRef.current || !onLayoutChange) return;
    const dx = (event.clientX - dragRef.current.startX) / zoom;
    const dy = (event.clientY - dragRef.current.startY) / zoom;
    onLayoutChange({
      ...layout,
      [dragRef.current.id]: {
        x: Math.max(0, dragRef.current.originX + dx),
        y: Math.max(0, dragRef.current.originY + dy),
      },
    });
  };

  const endDrag = (event: PointerEvent<HTMLElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const nodeDragProps = (nodeId: string) => ({
    onPointerDown: (event: PointerEvent<HTMLElement>) => beginDrag(nodeId, event),
    onPointerMove: moveDrag,
    onPointerUp: endDrag,
  });

  return (
    <div className="node-editor-page">
      <div className="node-editor">
        <aside className="node-palette" aria-label="Палитра нод">
          <div className="node-palette__head">
            <p className="node-palette__title">Добавить ноду</p>
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
            <span>Мера</span>
          </button>
          <button
            className="node-palette__item node-palette__item--dimension"
            type="button"
            disabled={!canWrite}
            onClick={() => onSelect('dimension:new')}
          >
            <Text size={18} />
            <span>Измерение</span>
          </button>
          <button className="node-palette__item is-disabled" type="button" disabled>
            <GitMerge size={18} />
            <span>Join</span>
          </button>
          <p className="node-palette__hint">
            Кликните «Мера» или «Измерение», чтобы добавить member на canvas. Связи задают SQL-маппинг.
          </p>
        </aside>

        <div className="node-canvas-wrap">
          <div className="node-canvas-mobile">
            <Monitor className="size-5 shrink-0" strokeWidth={1.75} />
            <span>Node-редактор удобнее на desktop · pinch-to-zoom на canvas</span>
          </div>
          <div className="node-canvas-toolbar">
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              aria-label="Уменьшить"
              onClick={() => setZoom((value) => Math.max(0.5, Number((value - 0.1).toFixed(2))))}
            >
              <Minus size={16} />
            </Button>
            <span className="node-canvas-toolbar__zoom">{Math.round(zoom * 100)}%</span>
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              aria-label="Увеличить"
              onClick={() => setZoom((value) => Math.min(1.5, Number((value + 0.1).toFixed(2))))}
            >
              <Plus size={16} />
            </Button>
            <span className="node-canvas-toolbar__spacer" />
            <Button variant="ghost" size="sm" type="button" onClick={() => setZoom(1)}>
              <Maximize2 size={14} />
              Вписать
            </Button>
            <Button variant="ghost" size="sm" type="button" onClick={() => onSelect(cubeNodeId)}>
              <Box size={14} />
              Куб
            </Button>
          </div>

          <div className="node-canvas">
            <div
              className="node-canvas__stage"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
            >
              <svg className="node-edges" aria-hidden="true">
                {edges.map((edge) => (
                  <path
                    key={edge.id}
                    d={edge.d}
                    className={cn(edge.active && 'is-active')}
                  />
                ))}
              </svg>

              <article
                className={cn('node node--source', selected === sourceNodeId && 'is-selected')}
                style={{ left: layout[sourceNodeId]?.x, top: layout[sourceNodeId]?.y }}
                onClick={() => onSelect(sourceNodeId)}
                {...nodeDragProps(sourceNodeId)}
                role="button"
                tabIndex={0}
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
                className={cn('node node--cube', selected === cubeNodeId && 'is-selected')}
                style={{ left: layout[cubeNodeId]?.x, top: layout[cubeNodeId]?.y }}
                onClick={() => onSelect(cubeNodeId)}
                {...nodeDragProps(cubeNodeId)}
                role="button"
                tabIndex={0}
              >
                <header className="node__header">
                  <span className="node__icon">
                    <Box size={14} />
                  </span>
                  <div className="node__titles">
                    <h3 className="node__title">{draft.name}</h3>
                    <p className="node__type">
                      Куб · {draft.measures.length} меры · {draft.dimensions.length} измерения
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

              {draft.measures.map((measure) => (
                <article
                  key={measure.id}
                  className={cn(
                    'node node--measure node--compact',
                    selected === measure.id && 'is-selected'
                  )}
                  style={{ left: layout[measure.id]?.x, top: layout[measure.id]?.y }}
                  onClick={() => onSelect(measure.id)}
                  {...nodeDragProps(measure.id)}
                  role="button"
                  tabIndex={0}
                >
                  <header className="node__header">
                    <span className="node__icon">
                      <Hash size={14} />
                    </span>
                    <div className="node__titles">
                      <h3 className="node__title">{measure.name}</h3>
                      <p className="node__type">Мера · {measure.type}</p>
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
                        <span>{measure.format}</span>
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
                    selected === dimension.id && 'is-selected'
                  )}
                  style={{ left: layout[dimension.id]?.x, top: layout[dimension.id]?.y }}
                  onClick={() => onSelect(dimension.id)}
                  {...nodeDragProps(dimension.id)}
                  role="button"
                  tabIndex={0}
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
                      <h3 className="node__title">{dimension.name}</h3>
                      <p className="node__type">
                        {dimension.locked ? 'Системное' : 'Измерение'} · {dimension.type}
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
                        <span>Granularity</span>
                        <span>{dimension.granularity}</span>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        <aside className="node-inspector" aria-label="Инспектор ноды">
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
            />
          </div>
          <div className="semantic-preview">
            <div className="semantic-preview__head">
              <span>Превью member</span>
              <span className="db-tag db-tag--gray">read-only</span>
            </div>
            <div className="semantic-preview__body">
              {memberName ? (
                <p className="semantic-preview__member">
                  {draft.name}.{memberName}
                </p>
              ) : null}
              <ul className="semantic-preview__links m-0 list-none p-0">
                <li>
                  <Link to="/dashboards">
                    Используется в {widgetCount} виджетах →
                  </Link>
                </li>
                <li>
                  <Link to="/insights">Используется в AI-инсайтах →</Link>
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
